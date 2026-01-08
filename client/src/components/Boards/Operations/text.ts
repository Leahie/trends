import {
  Bold, Italic, Underline, List, Type, Palette, Highlighter
} from "lucide-react";
import type { Operation } from "@/types/editorTypes";
import type { TextBlockType } from "@/types/types";

export const TEXT_OPERATIONS: Operation[] = [
  {
    id: 'bold',
    label: 'Bold',
    icon: Bold,
    blockTypes: ['text'],
    category: 'text',
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    }
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: Italic,
    blockTypes: ['text'],
    category: 'text',
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    }
  },
  {
    id: 'underline',
    label: 'Underline',
    icon: Underline,
    blockTypes: ['text'],
    category: 'text',
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    }
  },
  {
    id: 'bullet-list',
    label: 'Bullet List',
    icon: List,
    blockTypes: ['text'],
    category: 'text',
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    }
  },
  {
    id: 'text-color',
    label: 'Text Color',
    icon: Type,
    blockTypes: ['text'],
    requiresOverlay: true,
    category: 'text',
    apply: (block, params) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    }
  },
  {
    id: 'bg-color',
    label: 'Background',
    icon: Palette,
    blockTypes: ['text'],
    requiresOverlay: true,
    category: 'text',
    apply: (block, params) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          backgroundColor: params.color
        }
      };
    }
  },
  {
    id: 'highlight',
    label: 'Highlight',
    icon: Highlighter,
    blockTypes: ['text'],
    requiresOverlay: true,
    category: 'text',
    apply: (block, params) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          highlight: params.color
        }
      };
    }
  }
];