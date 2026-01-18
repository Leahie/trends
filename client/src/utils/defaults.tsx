// utils/blockFactory.ts
import { v4 as uuidv4 } from 'uuid';
import type { TextBlockType, BoardBlockType } from "../types/types";

export function createDefaultTextBlock(parentId: string): Partial<TextBlockType> {
  return {
    id:  uuidv4(),
    type: "text",
    boardId: parentId,
    content: {
      title: "Untitled",
      body: "",
    },
  };
}



export function createDefaultBoardBlock(parentId: string): Partial<BoardBlockType> {
  return {
    id:  uuidv4(),
    type: "board_block",
    boardId: parentId,
    // no linkedBoardId for now need to figure that out
    content: {
      title: "Untitled",
    },
  };
}

export function createDefaultLocation(x: number, y: number, zIndex: number = 1) {
  return {
    x,
    y,
    width: 300,
    height: 200,
    zIndex,
  };
}