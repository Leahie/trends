import type { Board } from "@/types/types";
import { api } from "@/utils/api";

export type SharedTreeNode = {
  board: Board;
  children: SharedTreeNode[];
};

export async function buildSharedTree(
  token: string,
  rootBoard: Board,
  visited = new Set<string>()
): Promise<SharedTreeNode> {
  visited.add(rootBoard.id);

  const blocksRes = await api.fetchSharedBoardBlocks(token, rootBoard.id);
  const blocks = blocksRes.success && blocksRes.data ? blocksRes.data.blocks : [];

  const boardBlocks = blocks.filter(b => b.type === "board_block");

  const children: SharedTreeNode[] = [];

  for (const block of boardBlocks) {
    const childId = block.linkedBoardId;
    if (!childId || visited.has(childId)) continue;

    const boardRes = await api.fetchSharedNestedBoard(token, childId);
    if (!boardRes.success || !boardRes.data) continue;

    const childNode = await buildSharedTree(token, boardRes.data.board, visited);
    children.push(childNode);
  }

  return { board: rootBoard, children };
}
