import './style.scss';
import * as bootstrap from 'bootstrap';
void bootstrap;
import JSZip from "jszip";

import * as commandGenerator from './commands';
import * as versions from './mc_versions';
import { e, type HAnchor, type HButton, type HDiv, 
    type HElem, type HInput, type HSelect, type HTextArea } from './aliases';
import { MAP_INFO_FILE_NAME, generateDataPack, isValidMapInfoFile, type MapInfo, type MapInfoFile, NEW_ID_SUB, generateCleanFunction } from './datapack';
import initializeCopyButtons from './copyButtons'
import { toggleAll } from './util';



initializeCopyButtons();


const datapackInput = e<HInput>('datapackInput');
const getCommandsButton = e<HButton>('getCommandsButton');
const itemFrameCommand = e<HTextArea>('itemFrameCommand');
const mapSelect = e<HSelect>('mapSelect');
const mapSelect2 = e<HSelect>('mapSelect2');
const glowItemFrameCheckbox = e<HInput>('glowItemFrameCheckbox');
const invisibleItemFrameCheckbox = e<HInput>('invisibleItemFrameCheckbox');
const nameItemFrameCheckbox = e<HInput>('nameItemFrameCheckbox');
const commandLengthWarning = e<HElem>('commandLengthWarning');
const commandsSection = e<HDiv>('commandsSection');
const cacheCommand = e<HTextArea>('cacheCommand');
const cacheCommandStuff = e<HDiv>('cacheCommandStuff');
const cleanCommand = e<HTextArea>('cleanCommand');
const combineButton = e<HButton>('combineButton');
const removeMapButton = e<HButton>('removeMapButton');
const versionSelect = e<HSelect>('versionSelect');
const goCombineButton = e<HButton>('goCombineButton');
const downloadDataPackButton = e<HAnchor>('downloadDataPackButton');
const firstStuff = e<HDiv>('firstStuff');
const combineSection = e<HDiv>('combineSection');
const resultsSection = e<HDiv>('resultsSection');
const goAgainButton = e<HButton>('goAgainButton');
let mapInfoFiles : MapInfoFile[] = [];

function failAlert(fileName: string, reason: string) {
    alert(`Failed to load datapack ${fileName}: ${reason}`);
    return false;
}

function collapseToDataPackVersion(version: number) {
    if (version >= versions.MC_1_21) return versions.MC_1_21;
    return versions.MC_1_20_5;
}

async function loadAll() {
    mapInfoFiles = [];
    for (const file of datapackInput.files!) {
        const zip = await JSZip.loadAsync(file);
        const mapInfoFileName = MAP_INFO_FILE_NAME + '.json';
        const mapInfoFile = zip.file(mapInfoFileName);
        if (!mapInfoFile) {
            return failAlert(file.name, `missing ${mapInfoFileName}`);
        }

        try {
            const mapInfoFileData = await mapInfoFile.async('string');
            const mapInfoFileJson = JSON.parse(mapInfoFileData);
            if (!isValidMapInfoFile(mapInfoFileJson)) return failAlert(file.name, `${mapInfoFileName} is not valid`);
            mapInfoFiles.push(mapInfoFileJson);
        } catch (err) {
            return failAlert(file.name, `failed to parse ${mapInfoFileName}`);
        }
    }
    return true;
}

getCommandsButton.onclick = async () => {
    const numFiles = datapackInput.files?.length!
    if (numFiles == 0) return alert('You need to add some files first bro');

    const success = await loadAll();
    if (!success) return;

    mapSelect.replaceChildren();

    for (const mapInfoFile of mapInfoFiles) {
        for (const mapInfo of mapInfoFile.data) {
            const option = document.createElement('option');
            option.value = `${mapInfoFile.id} ${mapInfoFile.version} ${mapInfo.startingIndex}`;
            const size = mapInfo.frames * mapInfo.mapsHeight * mapInfo.mapsWidth;
            option.innerText = `${mapInfo.mapName} (Pack ID: ${mapInfoFile.id} Map${size > 1 ? 's' : ''}: ${mapInfo.startingIndex}${size > 1 ? '-' + (mapInfo.startingIndex + size - 1) : ''})`;
            mapSelect.appendChild(option);
        }
    }

    commandsSection.style.display = 'block';
    generateItemFrameCommand();
}

function generateItemFrameCommand() {
    const id = mapSelect.value.split(' ')[0];
    //const version = parseInt(mapSelect.value.split(' ')[1]);
    const startingIndex = parseInt(mapSelect.value.split(' ')[2]);
    const file = mapInfoFiles.find(x => x.id === id);
    if (file) {
        const mapInfo = file.data.find(x => x.startingIndex === startingIndex);
        if (mapInfo) {
            itemFrameCommand.value = commandGenerator.generateItemFrameCommand_1_20_5(
                mapInfo, glowItemFrameCheckbox.checked, invisibleItemFrameCheckbox.checked, nameItemFrameCheckbox.checked)

            commandLengthWarning.style.display = itemFrameCommand.value.length > 256 ? 'block' : 'none';

            if (mapInfo.frames > 1) {
                cacheCommandStuff.style.display = 'block';
                cacheCommand.innerText = commandGenerator.cacheCommand(id, mapInfo.startingIndex);
            } else {
                cacheCommandStuff.style.display = 'none';
            }

            cleanCommand.innerText = commandGenerator.cleanCommand(id);
        }
    }
}

mapSelect.addEventListener('change', generateItemFrameCommand);
glowItemFrameCheckbox.addEventListener('change', generateItemFrameCommand);
invisibleItemFrameCheckbox.addEventListener('change', generateItemFrameCommand);
nameItemFrameCheckbox.addEventListener('change', generateItemFrameCommand);

combineButton.onclick = async () => {
    const numFiles = datapackInput.files?.length!
    if (numFiles == 0) return alert('You need to add some files first bro');
    
    const success = await loadAll();
    if (!success) return;
    
    mapSelect2.innerHTML = '<option value="">Select map to remove</option>';

    let highestVersion = 0;

    for (const mapInfoFile of mapInfoFiles) {
        for (const mapInfo of mapInfoFile.data) {
            const option = document.createElement('option');
            option.value = `${mapInfoFile.id} ${mapInfo.startingIndex}`;
            const size = mapInfo.frames * mapInfo.mapsHeight * mapInfo.mapsWidth;
            option.innerText = `${mapInfo.mapName} (Pack ID: ${mapInfoFile.id} Map${size > 1 ? 's' : ''}: ${mapInfo.startingIndex}${size > 1 ? '-' + (mapInfo.startingIndex + size - 1) : ''})`;
            mapSelect2.appendChild(option);
        }
        if (mapInfoFile.version > highestVersion) highestVersion = mapInfoFile.version;
    }

    versionSelect.value = '' + collapseToDataPackVersion(highestVersion);
    removeMapButton.disabled = true;
    commandsSection.style.display = 'none';
    combineSection.style.display = 'block';
}

function updateRemoveButton() {
    removeMapButton.disabled = !mapSelect2.value || 
    (mapInfoFiles.length === 1 && mapInfoFiles[0].data.length === 1);
}

mapSelect2.addEventListener('change', updateRemoveButton);

removeMapButton.onclick = () => {
    const val = mapSelect2.value;
    if (!val) return;
    const id = val.split(' ')[0];
    const startingIndex = parseInt(val.split(' ')[1]);
    if (confirm('Are you sure you want to remove the selected map?')) {
        const infoIndex = mapInfoFiles.findIndex(x => x.id === id);
        mapInfoFiles[infoIndex].data.splice(mapInfoFiles[infoIndex].data.findIndex(x => x.startingIndex === startingIndex), 1);
        if (mapInfoFiles[infoIndex].data.length === 0) {
            mapInfoFiles.splice(infoIndex, 1);
        }
        mapSelect2.selectedOptions[0]?.remove();
        mapSelect2.value = '';
        updateRemoveButton();
    }
}

function endingIndexOf(mapInfo: MapInfo) {
    return mapInfo.startingIndex + mapInfo.frames * mapInfo.mapsHeight * mapInfo.mapsWidth - 1;
}

goCombineButton.onclick = async () => {
    let mapData : MapInfo[] = [];
    for (const mapInfoFile of mapInfoFiles) {
        for (const mapInfo of mapInfoFile.data) {
            const foundDuplicateName = mapData.find(x => x.mapName === mapInfo.mapName);
            if (foundDuplicateName) return alert(`The name ${mapInfo.mapName} is duplicated. Please remove one of the duplicates before proceeding.`);
            const startingIndex = mapInfo.startingIndex;
            const endingIndex = endingIndexOf(mapInfo);
            const overlap = mapData.find(x => (startingIndex <= x.startingIndex && x.startingIndex <= endingIndex) ||
                (x.startingIndex <= startingIndex && startingIndex <= endingIndexOf(x)));
            if (overlap) return alert(`The maps ${mapInfo.mapName} and ${overlap.mapName} have overlapping map IDs. Please remove one of them before proceeding.`);
            mapData.push(mapInfo);
        } 
    }

    toggleAll(firstStuff, true);
    toggleAll(combineSection, true);
    goCombineButton.disabled = true;

    const datapack = await generateDataPack(mapData, parseInt(versionSelect.value), mapInfoFiles.map(x => generateCleanFunction(x.id)).join('\n') + '\n');
    downloadDataPackButton.href = URL.createObjectURL(datapack.pack);
    downloadDataPackButton.download = 'maps_datapack.zip';

    resultsSection.style.display = 'block';

}

function reset() {
    datapackInput.value = '';
    combineSection.style.display = 'none';
    resultsSection.style.display = 'none';
    toggleAll(firstStuff, false);
    toggleAll(combineSection, false);
    goCombineButton.disabled = false;
}

goAgainButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to go again? Your downloads will be lost if you haven't downloaded them already.")) {
        reset();
    }
})