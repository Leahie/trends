import type { ReactNode } from "react";
import type { Block } from "./types";
import type { ComponentType  } from "react";

export interface HistoryEntry {
  before: Record<string, Block>;
  after: Record<string, Block>;
  timestamp: number;
}

export interface Operation {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  blockTypes: Block['type'][];
  requiresOverlay?: boolean;
  category: 'universal' | 'image' | 'text';
  group: string;
  multiSelection: boolean;
  priority?: number; 
  apply: (block: Block, params?: any) => Partial<Block>;
  isActive?: (block: Block) => boolean;
}