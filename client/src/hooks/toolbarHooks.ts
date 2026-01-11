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

export function getSelectionXStats(
  ids: string[],
  dataMap: Record<string, Block>
) {
  let minX = Infinity;
  let maxX = -Infinity;
  let sumCenter = 0;
  let count = 0;

  for (const id of ids) {
    const block = dataMap[id];
    if (!block) continue;

    const { x, width } = block.location;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width);

    sumCenter += x + width / 2;
    count++;
  }

  const centerX = count ? sumCenter / count : 0;

  return { minX, maxX, centerX };
}
