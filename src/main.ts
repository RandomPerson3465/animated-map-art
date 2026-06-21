import { Buffer } from "buffer";
globalThis.Buffer = Buffer;
import JSZip from "jszip";
import { parseGIF, decompressFrames } from "gifuct-js";

import { colorTable } from "./color_table";
import { colorToString, findIndexOfNearestColor, getPixelOnCanvas, gzip, isValidTag, MC_MAP_SIZE } from "./util";
import { TAG, NbtWriter } from "node-nbt";
import { generateDataPack, ITEM_FRAME_AIR_TAG, type mapInfo } from "./datapack";

const opacityThreshold = 0;

const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const versionSelect = document.getElementById('versionSelect') as HTMLSelectElement;
const mapNameInput = document.getElementById('mapNameInput') as HTMLInputElement;
const submitButton = document.getElementById('submitButton') as HTMLButtonElement;
const mapIndexInput = document.getElementById('mapIndexInput') as HTMLInputElement;
const incrementIndexCheckbox = document.getElementById('incrementIndexCheckbox') as HTMLInputElement;
const currentIndexText = document.getElementById('currentIndexText') as HTMLElement;
const totalImagesText = document.getElementById('totalImagesText') as HTMLElement;
const previousImageButton = document.getElementById('previousImageButton') as HTMLButtonElement;
const nextImageButton = document.getElementById('nextImageButton') as HTMLButtonElement;
const finishButton = document.getElementById('finishButton') as HTMLButtonElement;
const cancelButton = document.getElementById('cancelButton') as HTMLButtonElement;
const currentImage = document.getElementById('currentImage') as HTMLCanvasElement;
const previewImage = document.getElementById('previewImage') as HTMLCanvasElement;
const preview_ctx = previewImage.getContext('2d')!
const resultsSection = document.getElementById('resultsSection') as HTMLDivElement;
const downloadButton = document.getElementById('downloadButton') as HTMLAnchorElement;
const downloadDataPackButton = document.getElementById('downloadDataPackButton') as HTMLAnchorElement;
const newMapButton = document.getElementById('newMapButton') as HTMLButtonElement;
const widthInput = document.getElementById('widthInput') as HTMLInputElement;
const heightInput = document.getElementById('heightInput') as HTMLInputElement;
const fitSetting = document.getElementById('fitSetting') as HTMLSelectElement;
const ticksPerFrameSetting = document.getElementById('ticksPerFrameSetting') as HTMLSelectElement; 
const autoSizeCheckbox = document.getElementById('autoSizeCheckbox') as HTMLInputElement;
const itemFrameCommand = document.getElementById('itemFrameCommand') as HTMLTextAreaElement;
const mapSelect = document.getElementById('mapSelect') as HTMLSelectElement;
const glowItemFrameCheckbox = document.getElementById('glowItemFrameCheckbox') as HTMLInputElement;
const invisibleItemFrameCheckbox = document.getElementById('invisibleItemFrameCheckbox') as HTMLInputElement;
const nameItemFrameCheckbox = document.getElementById('nameItemFrameCheckbox') as HTMLInputElement;
const commandLengthWarning = document.getElementById('commandLengthWarning') as HTMLParagraphElement;

const ctx = currentImage.getContext('2d', { willReadFrequently: true })!;

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
    await img.decode();
  } else {
    img = canvas;
  }
  mapNameInput.value = settingsList[currentIndex]?.mapName || autoName(name);
  if (autoSizeCheckbox.checked) {
    widthInput.value = '' + Math.ceil(img.width / MC_MAP_SIZE);
    heightInput.value = '' + Math.ceil(img.height / MC_MAP_SIZE);
  }

  if (!getSettings()) return;
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
      if (pixel[1] > opacityThreshold) {
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
  if (image.type === 'image/gif') {
    const gif = parseGIF(await image.arrayBuffer());
    const frames = decompressFrames(gif, true);
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
        }
      }
    }
   } else {
    for (let i = 0; i < s.mapsHeight; ++i) {
      for (let j = 0; j < s.mapsWidth; ++j) {
        const imgData = ctx.getImageData(j * MC_MAP_SIZE, i * MC_MAP_SIZE, MC_MAP_SIZE, MC_MAP_SIZE);
        await mapFromImageData(imgData);
      }
    }
  }
}

async function loadImage() {
  previousImageButton.disabled = (finishing || currentIndex === 0);
  nextImageButton.disabled = (finishing || currentIndex === numFiles - 1);
  currentIndexText.innerText = '' + (currentIndex + 1);
  await drawCurrentImage();
}



submitButton.addEventListener('click', async () => {

  maps_zip = new JSZip();

  mapIndex = parseInt(mapIndexInput.value) || 0;

  numFiles = imageInput.files!.length;
  if (numFiles == 0) return alert('You need to add some files first bro');
  imageInput.disabled = true;
  totalImagesText.innerText = '' + numFiles;
  currentIndex = 0;
  cancelButton.disabled = false;
  finishButton.disabled = false;
  await loadImage();

})

previousImageButton.addEventListener('click', async () => {
  --currentIndex;
  loadSettings();
  await loadImage();
})

nextImageButton.addEventListener('click', async () => {
  await processImage();
  ++currentIndex;
  if (settingsList[currentIndex]) loadSettings();
  await loadImage();
})

finishButton.addEventListener('click', async () => {
  if (currentIndex === numFiles - 1 || confirm('Are you sure you want to finish?')) {
    finishing = true;
    cancelButton.disabled = true;
    finishButton.disabled = true;
    while (currentIndex < numFiles - 1) {
      await processImage();
      ++currentIndex;
      if (settingsList[currentIndex]) loadSettings();
      await loadImage();
    }
    previousImageButton.disabled = true;
    nextImageButton.disabled = true;
    await processImage();
  
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

    const datapack = await generateDataPack(mapData);
    downloadDataPackButton.href = URL.createObjectURL(datapack);
    downloadDataPackButton.download = 'maps_datapack.zip';
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
    reset();
  }
})

newMapButton.addEventListener('click', () => {
  if (confirm("Are you sure you want to go again? Your downloads will be lost if you haven't downloaded them already.")) {
    reset();
  }
})

function generateItemFrameCommand() {
  const glow = glowItemFrameCheckbox.checked ? 'glow_' : '';
  const invis = invisibleItemFrameCheckbox.checked ? 'Invisible:1b,' : '';
  const mapInfo = mapData[parseInt(mapSelect.value)];
  const index = mapInfo.startingIndex;
  const name = mapInfo.mapName;
  const itemName = nameItemFrameCheckbox.checked ? `item_name="${name}",` : '';

  itemFrameCommand.value = `/give @p ${glow}item_frame[${itemName}entity_data={id:${glow}item_frame,${invis}Air:${ITEM_FRAME_AIR_TAG}s,Tags:["${name}"],Item:{id:"filled_map",count:1,components:{"map_id":${index}}}}]`;
  
  commandLengthWarning.style.display = itemFrameCommand.value.length > 256 ? 'block' : 'none';
}

widthInput.addEventListener('change', drawCurrentImage);
heightInput.addEventListener('change', drawCurrentImage);
fitSetting.addEventListener('change', drawCurrentImage);
glowItemFrameCheckbox.addEventListener('change', generateItemFrameCommand);
invisibleItemFrameCheckbox.addEventListener('change', generateItemFrameCommand);
nameItemFrameCheckbox.addEventListener('change', generateItemFrameCommand);
mapSelect.addEventListener('change', generateItemFrameCommand);

function reset() {
  previousImageButton.disabled = true;
  nextImageButton.disabled = true;
  finishButton.disabled = true;
  cancelButton.disabled = true;
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
}

reset();