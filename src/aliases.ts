export type HElem = HTMLElement;
export type HButton = HTMLButtonElement;
export type HInput = HTMLInputElement;
export type HSelect = HTMLSelectElement;
export type HCanvas = HTMLCanvasElement;
export type HAnchor = HTMLAnchorElement;
export type HDiv = HTMLDivElement;
export type HTextArea = HTMLTextAreaElement;

export function e<T extends HTMLElement>(id: string) {
    return document.getElementById(id) as T;
}