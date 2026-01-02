// utils/blockFactory.ts
import { v4 as uuidv4 } from 'uuid';
import type { Block, Location, TextBlockType, ImageBlockType, BoardBlockType } from "../types";

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

export function createDefaultImageBlock(parentId: string): Partial<ImageBlockType> {
  return {
    id:  uuidv4(),
    type: "image",
    boardId: parentId,
    content: {
        title: "Untitled",
        url: "",
        source: "external",
    },
  };
}

export function createDefaultDiaryBlock(parentId: string): Partial<BoardBlockType> {
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

export function createDefaultLocation(x: number, y: number, zIndex: number = 1): BlockSizeType {
  return {
    x,
    y,
    width: 300,
    height: 200,
    zIndex,
  };
}