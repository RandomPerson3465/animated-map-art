import { type mapInfo, ITEM_FRAME_AIR_TAG, PREFIX } from "./datapack";

export function generateItemFrameCommand_1_20_5(mapInfo: mapInfo, glowItemFrame: boolean, invisItemFrame: boolean, nameItemFrame: boolean) {
    const glow = glowItemFrame ? 'glow_' : '';
    const invis = invisItemFrame ? 'Invisible:1b,' : '';
    const index = mapInfo.startingIndex;
    const name = mapInfo.mapName;
    const itemName = nameItemFrame ? `item_name="${name}",` : '';
    return `/give @p ${glow}item_frame[${itemName}entity_data={id:${glow}item_frame,${invis}Air:${ITEM_FRAME_AIR_TAG}s,Tags:["${name}"],Item:{id:"filled_map",count:1,components:{"map_id":${index}}}}]`;
}

export function cacheCommand(id: string, index: number) {
    return `/scoreboard players set @p c_${id} ${index}`;
}

export function cleanCommand(id: string) {
    return `/function ${PREFIX}${id}:clean`;
}