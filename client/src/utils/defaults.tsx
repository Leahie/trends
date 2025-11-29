// utils/blockFactory.ts
import { v4 as uuidv4 } from 'uuid';
import type { Block, BlockSizeType, TextBlockType, ImageBlockType, DiaryBlockType } from "../types";

export function createDefaultTextBlock(parentId: string): TextBlockType {
  return {
    id:  uuidv4(),
    type: "text",
    parent: parentId,
    properties: {
      title: "Untitled",
      body: "",
    },
  };
}

export function createDefaultImageBlock(parentId: string): ImageBlockType {
  return {
    id:  uuidv4(),
    type: "image",
    parent: parentId,
    properties: {
        title: "Untitled",
        url: "",
        source: "external",
    },
  };
}

export function createDefaultDiaryBlock(parentId: string): DiaryBlockType {
  return {
    id:  uuidv4(),
    type: "diary_entry",
    parent: parentId,
    properties: {
      title: "Untitled",
    },
    content: [],
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