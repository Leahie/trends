// A REAL WORK IN PROGRESS, Text formating is not like this
import {
  Palette
} from "lucide-react";
import type { Operation } from "@/types/editorTypes";
import type { TextBlockType } from "@/types/types";

export const TEXT_OPERATIONS: Operation[] = [
  {
    id: 'bg-color',
    label: 'Background',
    icon: Palette,
    blockTypes: ['text'],
    requiresOverlay: false,
    category: 'text',
    group: 'colors',
    priority: 2,
    multiSelection: true,

    apply: (block, params) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          bgColor: params.color
        }
      };
    },
  },
];