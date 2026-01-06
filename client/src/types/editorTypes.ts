import type { ReactNode } from "react";
import type { Block } from "./types";

export interface HistoryEntry {
  blockId: string;
  before: Block;
  after: Block;
  timestamp: number;
}

export interface Operation {
  id: string;
  label: string;
  icon: ReactNode;
  blockTypes: Block['type'][];
  requiresOverlay?: boolean;
  category: 'universal' | 'image' | 'text';
  apply: (blockId: string, params: any) => Promise<void>;
}