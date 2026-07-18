import type { Color } from "./color_table";
export const MC_MAP_SIZE = 128;

export interface Pair<K, V> {
    '0': K,
    '1': V
}

function colorDistance(c1: Color, c2: Color) : number {
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    return dr * dr + dg * dg + db * db;
}

// Find index of nearest color in color table;
export function findIndexOfNearestColor(color: Color, table: Color[]) : number {
    if (!table.length) return -1;
    let nearestIndex = 0;
    let nearestDistance = colorDistance(color, table[0]);
    for (let i = 1; i < table.length; ++i) {
        const dist = colorDistance(color, table[i]);
        if (dist < nearestDistance) {
            nearestIndex = i;
            nearestDistance = dist;
        }
    }
    return nearestIndex;
}

export function colorToString(color: Color) : string {
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

export function getPixelOnCanvas(x : number, y : number, imgData : ImageData) : Pair<Color, number> {
  const index = (y << 2) * MC_MAP_SIZE + (x << 2);
  return [[imgData.data[index], imgData.data[index+1], imgData.data[index+2]], imgData.data[index+3]]
}

export async function gzip(data: string) : Promise<Blob> {
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'));
    return await new Response(stream).blob();
}

export function isValidTag(str: string) {
    return str.match(/[^0-9|A-Z|a-z|\_\-\.]/) === null && !str.endsWith('.');
}

export function idGen(length: number) {
    const validChars = '0123456789abcdefghijklmnopqrstuvwxyz-_';
    let id = '';
    for (let i = 0; i < length; ++i) {
        id += validChars[Math.floor(Math.random() * validChars.length)];
    }
    return id;
}

export function toggleAll(elem: HTMLElement, disabled: boolean) {
    const elems = elem.querySelectorAll<HTMLButtonElement|HTMLSelectElement|HTMLInputElement|HTMLTextAreaElement>('button,select,input,textarea');
    elems.forEach(e => e.disabled = disabled);
} 