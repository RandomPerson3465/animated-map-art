import './style.scss';
import * as bootstrap from 'bootstrap'
import { Buffer } from "buffer";
import initializeTooltips from './tooltips';
import initializeCopyButtons from './copyButtons'
import * as commandGenerator from './command'


globalThis.Buffer = Buffer;
import JSZip from "jszip";
import { parseGIF, decompressFrames } from "gifuct-js";

import { colorTable } from "./color_table";
import { colorToString, findIndexOfNearestColor, getPixelOnCanvas, gzip, isValidTag, MC_MAP_SIZE, toggleAll } from "./util";
import { TAG, NbtWriter } from "node-nbt";
import { generateDataPack, type mapInfo } from "./datapack";

initializeCopyButtons();
initializeTooltips();

function e<T extends HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

type HElem = HTMLElement;
type HButton = HTMLButtonElement;
type HInput = HTMLInputElement;
type HSelect = HTMLSelectElement;
type HCanvas = HTMLCanvasElement;
type HAnchor = HTMLAnchorElement;
type HDiv = HTMLDivElement;
type HTextArea = HTMLTextAreaElement;

const imageInput = e<HInput>('imageInput');
const versionSelect = e<HSelect>('versionSelect');
const mapNameInput = e<HInput>('mapNameInput');
const submitButton = e<HButton>('submitButton')
const mapIndexInput = e<HInput>('mapIndexInput');
const incrementIndexCheckbox = e<HInput>('incrementIndexCheckbox');
const currentIndexText = e<HElem>('currentIndexText');
const statusText = e<HElem>('statusText');
const totalImagesText = e<HElem>('totalImagesText');
const previousImageButton = e<HButton>('previousImageButton');
const nextImageButton = e<HButton>('nextImageButton');
const finishButton = e<HButton>('finishButton');
const cancelButton = e<HButton>('cancelButton');
const currentImage = e<HCanvas>('currentImage');
const previewImage = e<HCanvas>('previewImage');
const resultsSection = e<HDiv>('resultsSection');
const downloadButton = e<HAnchor>('downloadButton');
const downloadDataPackButton = e<HAnchor>('downloadDataPackButton');
const newMapButton = e<HButton>('newMapButton');
const widthInput = e<HInput>('widthInput');
const heightInput = e<HInput>('heightInput');
const fitSetting = e<HSelect>('fitSetting');
const ticksPerFrameSetting = e<HSelect>('ticksPerFrameSetting');
const autoSizeCheckbox = e<HInput>('autoSizeCheckbox');
const itemFrameCommand = e<HTextArea>('itemFrameCommand');
const mapSelect = e<HSelect>('mapSelect');
const glowItemFrameCheckbox = e<HInput>('glowItemFrameCheckbox');
const invisibleItemFrameCheckbox = e<HInput>('invisibleItemFrameCheckbox');
const nameItemFrameCheckbox = e<HInput>('nameItemFrameCheckbox');
const commandLengthWarning = e<HElem>('commandLengthWarning');
const opacityThresholdSetting = e<HInput>('opacityThresholdSetting');
const opacityValue = e<HElem>('opacityValue');
const afterSubmittingStuff = e<HDiv>('afterSubmittingStuff');
const cacheCommand = e<HTextArea>('cacheCommand');
const cacheCommandStuff = e<HDiv>('cacheCommandStuff');
const firstStuff = e<HDiv>('firstStuff');

const ctx = currentImage.getContext('2d', { willReadFrequently: true })!;
const preview_ctx = previewImage.getContext('2d')!;

interface settings {
  fit: string,
  mapName: string,
  mapsWidth: number,
  mapsHeight: number,
  ticksPerFrame: number
}

let settingsList : settings[] = [];
let mapData : mapInfo[] = [];

function getSettings() {
  const w = parseInt(widthInput.value);
  if (w < 1 || !isFinite(w)) {
    alert('Invalid value for width.');
    return false;
  }
  const h = parseInt(heightInput.value);
  if (h < 1 || !isFinite(h)) {
    alert('Invalid value for height.');
    return false;
  }
  const s = mapNameInput.value;
  if (!isValidTag(s)) {
    alert('Name can only contain letters, numbers, periods (.), hyphens (-), and underscores (_).');
    return false;  
  }
  if (settingsList.slice(0, currentIndex).find(x => x.mapName === s)) {
    alert('There already is a map with that name.');
    return false;
  }
  settingsList[currentIndex] = {
    fit: fitSetting.value,
    mapName: mapNameInput.value,
    mapsWidth: parseInt(widthInput.value) || 1,
    mapsHeight: parseInt(heightInput.value) || 1,
    ticksPerFrame: parseInt(ticksPerFrameSetting.value) || 1
  }

  if (mapData[currentIndex]) {
    mapData[currentIndex].mapName = settingsList[currentIndex].mapName;
    mapData[currentIndex].ticksPerFrame = settingsList[currentIndex].ticksPerFrame;
  }
  return true;
}

function loadSettings() {
  const s = settingsList[currentIndex];
  fitSetting.value = s.fit;
  mapNameInput.value = s.mapName;
  widthInput.value = '' + s.mapsWidth;
  heightInput.value = '' + s.mapsHeight;
  ticksPerFrameSetting.value = '' + s.ticksPerFrame;
}

let mapIndex = 0;
let currentIndex = 0;
let numFiles = 0;
let maps_zip : JSZip;
let finishing = false;
let datapackId = '';

function autoName(fileName: string) {
  const dotPos = fileName.lastIndexOf('.');
  if (dotPos !== -1) {
    fileName = fileName.substring(0, dotPos);
  }
  if (!fileName) fileName = '_';
  fileName = fileName.replace(/[^0-9|A-Z|a-z|\_\-\.]/g, '_');
  let currentFileName = fileName;
  let i = 0;
  while (settingsList.slice(0, currentIndex).find(s => s.mapName === currentFileName)) {
    ++i;
    currentFileName = fileName + '_' + i;
  }
  return currentFileName;
}

async function drawCurrentImage() {
  const image = imageInput.files![currentIndex];
  const url = URL.createObjectURL(image);
  return await drawImage(url, image.name, 1);
}

async function drawImage(url: string, name: string, frame: number, canvas? : HTMLCanvasElement) {
  let img : CanvasImageSource;
  if (!canvas) {
    img = new Image();
    img.src = url;
    await img.decode().catch(() => {});
  } else {
    img = canvas;
  }
  mapNameInput.value = settingsList[currentIndex]?.mapName || autoName(name);
  if (autoSizeCheckbox.checked) {
    widthInput.value = '' + Math.ceil(img.width / MC_MAP_SIZE);
    heightInput.value = '' + Math.ceil(img.height / MC_MAP_SIZE);
  }

  if (!getSettings()) return false;
  const s = settingsList[currentIndex];
  mapData[currentIndex] = {
    mapName: s.mapName,
    mapsWidth: s.mapsWidth,
    mapsHeight: s.mapsHeight,
    ticksPerFrame: s.ticksPerFrame,
    startingIndex: mapData[currentIndex] ? mapData[currentIndex].startingIndex : mapIndex,
    frames: frame
  };
  
  currentImage.width = s.mapsWidth * MC_MAP_SIZE;
  currentImage.height = s.mapsHeight * MC_MAP_SIZE;
  let offsetX = 0;
  let offsetY = 0;
  switch (fitSetting.value) {
    case 'center':
      offsetX = Math.floor((currentImage.width - img.width) / 2);
      offsetY = Math.floor((currentImage.height - img.height) / 2);
      break;
    case 'topRight':
      offsetX = currentImage.width - img.width;
      break;
    case 'bottomLeft':
      offsetY = currentImage.height - img.height;
      break;
    case 'bottomRight':
      offsetX = currentImage.width - img.width;
      offsetY = currentImage.height - img.height;
      break;
  }
  ctx.drawImage(img, offsetX, offsetY, fitSetting.value === 'resize' ? currentImage.width : img.width, 
    fitSetting.value === 'resize' ? currentImage.height : img.height);
}

async function mapFromImageData(imgData: ImageData) {
  const nbtValues = new Int8Array(MC_MAP_SIZE * MC_MAP_SIZE);
  preview_ctx.clearRect(0, 0, previewImage.width, previewImage.height);
  for (let x = 0; x < MC_MAP_SIZE; ++x) {
    for (let y = 0; y < MC_MAP_SIZE; ++y) {
      const pixel = getPixelOnCanvas(x, y, imgData);
      if (pixel[1] >= parseInt(opacityThresholdSetting.value)) {
        const indexOfNearestColor = findIndexOfNearestColor(pixel[0], colorTable);
        nbtValues[y * MC_MAP_SIZE + x] = indexOfNearestColor + 4;
        const nearestColor = colorToString(colorTable[indexOfNearestColor]);
        preview_ctx.fillStyle = nearestColor;
        preview_ctx.fillRect(x, y, 1, 1);
      } else {
        nbtValues[y * MC_MAP_SIZE + x] = 0;
      }
    }
  }
  const mapNBT = {
    name: '',
    type: TAG.COMPOUND,
    val: [
      {
        name: 'data',
        type: TAG.COMPOUND,
        val: [
          {
            name: 'scale',
            type: TAG.BYTE,
            val: 0
          },
          {
            name: 'dimension',
            type: TAG.STRING,
            val: 'minecraft:overworld'
          },
          {
            name: 'trackingPosition',
            type: TAG.BYTE,
            val: 0
          },
          {
            name: 'locked',
            type: TAG.BYTE,
            val: 1
          },
          {
            name: 'xCenter',
            type: TAG.INT,
            val: 0
          },
          {
            name: 'zCenter',
            type: TAG.INT,
            val: 0
          },
          {
            name: 'colors',
            type: TAG.BYTEARRAY,
            val: nbtValues
          }
        ]
      }
    ]
  }
  const nbtData = NbtWriter.writeTag(mapNBT);
  maps_zip.file((mapIndex++) + '.dat', await gzip(nbtData));
}

async function processImage() {
  const s = settingsList[currentIndex];
  const image = imageInput.files![currentIndex];
  let currentMapsDone = 0;
  if (image.type === 'image/gif') {
    const gif = parseGIF(await image.arrayBuffer());
    const frames = decompressFrames(gif, true);
    const totalMaps = frames.length * s.mapsHeight * s.mapsWidth;
    statusText.innerText = `0 of ${totalMaps} maps processed (0%)`;
    const auxillaryCanvas = document.createElement('canvas');
    const auxillary_ctx = auxillaryCanvas.getContext('2d')!;
    auxillaryCanvas.width = gif.lsd.width;
    auxillaryCanvas.height = gif.lsd.height;
    
    for (let f = 0; f < frames.length; ++f) {
      const frame = frames[f];
      const imageDataPreprocessed = auxillary_ctx.createImageData(frame.dims.width, frame.dims.height);
      imageDataPreprocessed.data.set(frame.patch);
      const tertiaryCanvas = document.createElement('canvas');
      tertiaryCanvas.width = frame.dims.width;
      tertiaryCanvas.height = frame.dims.height;
      const tertiary_ctx = tertiaryCanvas.getContext('2d')!;
      tertiary_ctx.putImageData(imageDataPreprocessed, 0, 0);
      auxillary_ctx.drawImage(tertiaryCanvas, frame.dims.left, frame.dims.top)
      drawImage('', '', f+1, auxillaryCanvas);  
      for (let i = 0; i < s.mapsHeight; ++i) {
        for (let j = 0; j < s.mapsWidth; ++j) {
          const imgData = ctx.getImageData(j * MC_MAP_SIZE, i * MC_MAP_SIZE, MC_MAP_SIZE, MC_MAP_SIZE);
          await mapFromImageData(imgData);
          currentMapsDone++;
          statusText.innerText = `${currentMapsDone} of ${totalMaps} maps processed (${Math.floor(currentMapsDone / totalMaps * 100)}%)`;
        }
      }
    }
  } else {
    const totalMaps = s.mapsHeight * s.mapsWidth;
    for (let i = 0; i < s.mapsHeight; ++i) {
      for (let j = 0; j < s.mapsWidth; ++j) {
        const imgData = ctx.getImageData(j * MC_MAP_SIZE, i * MC_MAP_SIZE, MC_MAP_SIZE, MC_MAP_SIZE);
        await mapFromImageData(imgData);
        currentMapsDone++;
        statusText.innerText = `${currentMapsDone} of ${totalMaps} maps processed (${Math.floor(currentMapsDone / totalMaps * 100)}%)`;
      }
    }
  }
}

async function loadImage() {
  opacityValue.innerText = opacityThresholdSetting.value;
  previousImageButton.disabled = (finishing || currentIndex === 0);
  nextImageButton.disabled = (finishing || currentIndex === numFiles - 1);
  currentIndexText.innerText = '' + (currentIndex + 1);
  await drawCurrentImage();
}



submitButton.addEventListener('click', async () => {

  numFiles = imageInput.files!.length;
  if (numFiles == 0) return alert('You need to add some files first bro');

  afterSubmittingStuff.style.display = 'block';

  maps_zip = new JSZip();

  mapIndex = parseInt(mapIndexInput.value) || 0;

  
  toggleAll(firstStuff, true);
  toggleAll(afterSubmittingStuff, false);
  totalImagesText.innerText = '' + numFiles;
  currentIndex = 0;
  statusText.innerText = 'Waiting';
  await loadImage();

})

previousImageButton.addEventListener('click', async () => {
  --currentIndex;
  loadSettings();
  await loadImage();
})

nextImageButton.addEventListener('click', async () => {
  if (!getSettings()) return;
  const nextImageButtonDisabled = nextImageButton.disabled;
  nextImageButton.disabled = true;
  await processImage();
  ++currentIndex;
  nextImageButton.disabled = nextImageButtonDisabled;
  statusText.innerText = 'Waiting';
  if (settingsList[currentIndex]) loadSettings();
  await loadImage();
})

finishButton.addEventListener('click', async () => {
  if (currentIndex === numFiles - 1 || confirm('Are you sure you want to finish?')) {
    if (!getSettings()) return;
    finishing = true;
    toggleAll(afterSubmittingStuff, true);
    cancelButton.disabled = false;
    while (currentIndex < numFiles - 1) {
      await processImage();
      ++currentIndex;
      if (settingsList[currentIndex]) loadSettings();
      await loadImage();
    }
    await processImage();
    statusText.innerText = 'Generating ZIP for maps';
  
    const lastIdFile = await gzip(NbtWriter.writeTag({
      name: '',
      type: TAG.COMPOUND,
      val: [
        {
          name: 'data',
          type: TAG.COMPOUND,
          val: [
            {
              name: 'map',
              type: TAG.INT,
              val: mapIndex - 1
            }
          ]
        },
        {
          name: 'DataVersion',
          type: TAG.INT,
          val: parseInt(versionSelect.value)
        }
      ]
    }))

    maps_zip.file('last_id.dat', lastIdFile);
    const file = await maps_zip.generateAsync({ type: 'blob' });
    downloadButton.href = URL.createObjectURL(file);
    downloadButton.download = 'maps.zip';

    if (incrementIndexCheckbox.checked) {
      mapIndexInput.value = '' + mapIndex;
    }

    statusText.innerText = 'Generating data pack';
    const datapack = await generateDataPack(mapData);
    downloadDataPackButton.href = URL.createObjectURL(datapack.pack);
    downloadDataPackButton.download = 'maps_datapack.zip';
    datapackId = datapack.id;
    statusText.innerText = 'Done!'

    for (let i = 0; i < mapData.length; ++i) {
      const option = document.createElement('option');
      option.value = '' + mapData[i].startingIndex;
      option.innerText = mapData[i].mapName;
      mapSelect.appendChild(option);
    }
    generateItemFrameCommand();
    resultsSection.style.display = 'block';
  }
})

cancelButton.addEventListener('click', () => {
  if (confirm('Are you sure you want to cancel?')) {
    window.location.reload();
  }
})

newMapButton.addEventListener('click', () => {
  if (confirm("Are you sure you want to go again? Your downloads will be lost if you haven't downloaded them already.")) {
    reset();
  }
})

opacityThresholdSetting.addEventListener('input', () => {
  opacityValue.innerText = opacityThresholdSetting.value;
})

function generateItemFrameCommand() {
  const mapInfo = mapData.find(x => x.startingIndex === parseInt(mapSelect.value))!;
  itemFrameCommand.value = commandGenerator.generateItemFrameCommand_1_20_5(
    mapInfo, glowItemFrameCheckbox.checked, invisibleItemFrameCheckbox.checked, nameItemFrameCheckbox.checked)
  
  commandLengthWarning.style.display = itemFrameCommand.value.length > 256 ? 'block' : 'none';

  if (mapInfo.frames > 1) {
    cacheCommandStuff.style.display = 'block';
    cacheCommand.innerText = commandGenerator.cacheCommand(datapackId, mapInfo.startingIndex);
  } else {
    cacheCommandStuff.style.display = 'none';
  }
}

widthInput.addEventListener('change', drawCurrentImage);
heightInput.addEventListener('change', drawCurrentImage);
fitSetting.addEventListener('change', drawCurrentImage);
glowItemFrameCheckbox.addEventListener('change', generateItemFrameCommand);
invisibleItemFrameCheckbox.addEventListener('change', generateItemFrameCommand);
nameItemFrameCheckbox.addEventListener('change', generateItemFrameCommand);
mapSelect.addEventListener('change', generateItemFrameCommand);

function reset() {
  afterSubmittingStuff.style.display = 'none';

  toggleAll(firstStuff, false);
  toggleAll(afterSubmittingStuff, false);

  currentIndex = 0;
  numFiles = 0;
  currentIndexText.innerText = '0';
  totalImagesText.innerText = '0';
  ctx.clearRect(0, 0, currentImage.width, currentImage.height);
  preview_ctx.clearRect(0, 0, previewImage.width, previewImage.height);

  resultsSection.style.display = 'none';

  imageInput.value = '';
  imageInput.disabled = false;
  finishing = false;
  settingsList = [];
  mapData = [];
  currentImage.width = MC_MAP_SIZE;
  currentImage.height = MC_MAP_SIZE;
  mapSelect.replaceChildren();
  statusText.innerText = '';
}

reset();