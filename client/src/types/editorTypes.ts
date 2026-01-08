import type { ReactNode } from "react";
import type { Block } from "./types";
import type { ComponentType  } from "react";

export interface HistoryEntry {
  blockId: string;
  before: Block;
  after: Block;
  timestamp: number;
}

export interface Operation {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  blockTypes: Block['type'][];
  requiresOverlay?: boolean;
  category: 'universal' | 'image' | 'text';
  apply: (block: Block, params?: any) => Partial<Block>;
}