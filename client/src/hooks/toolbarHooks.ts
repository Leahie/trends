import type { Block } from "@/types/types";

export const getBlockTypes = (
    selectedBlockIds: string[],
    dataMap: Record<string, Block>,
    maxTypes = 3
): Set<Block["type"]> => {
    const types = new Set<Block["type"]>();

    for (const id of selectedBlockIds) {
        const block = dataMap[id];
        if (!block) continue;

        types.add(block.type);

        if (types.size >= maxTypes) {
        break; 
        }
    }

    return types;
}