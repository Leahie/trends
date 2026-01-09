// A REAL WORK IN PROGRESS, Text formating is not like this
import {
  Bold, Italic, Underline, List, Type, Palette, Highlighter, AlignLeft, AlignCenter, AlignRight
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
    group: 'formatting',
    priority: 1,
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    },
    isEditingText: true,
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: Italic,
    blockTypes: ['text'],
    category: 'text',
    group: 'formatting',
    priority: 1,
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    },
    isEditingText: true,
  },
  {
    id: 'underline',
    label: 'Underline',
    icon: Underline,
    blockTypes: ['text'],
    category: 'text',
    group: 'formatting',
    priority: 1,
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    },
    isEditingText: true,
  },
  {
    id: 'bullet-list',
    label: 'Bullet List',
    icon: List,
    blockTypes: ['text'],
    category: 'text',
    group: 'list-align',
    priority: 3,
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    },
    isEditingText: true,
  },
  {
    id: 'text-color',
    label: 'Text Color',
    icon: Type,
    blockTypes: ['text'],
    requiresOverlay: true,
    category: 'text',
    group: 'colors',
    priority: 2,
    apply: (block, params) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          // TO DO 
        }
      };
    },
    isEditingText: true,
  },
  {
    id: 'bg-color',
    label: 'Background',
    icon: Palette,
    blockTypes: ['text'],
    requiresOverlay: true,
    category: 'text',
    group: 'colors',
    priority: 2,
    apply: (block, params) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          backgroundColor: params.color
        }
      };
    },
    isEditingText: true,
  },
  {
    id: 'highlight',
    label: 'Highlight',
    icon: Highlighter,
    blockTypes: ['text'],
    requiresOverlay: true,
    category: 'text',
    group: 'colors',
    priority: 2,
    apply: (block, params) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          highlight: params.color
        }
      };
    },
    isEditingText: true,
  },
  {
    id: 'align-left',
    label: 'Align Left',
    icon: AlignLeft,
    blockTypes: ['text'],
    category: 'text',
    group: 'list-align',
    priority: 3,
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          textAlign: 'left'
        }
      };
    },
    isEditingText: true,
  },
  {
    id: 'align-center',
    label: 'Align Center',
    icon: AlignCenter,
    blockTypes: ['text'],
    category: 'text',
    group: 'list-align',
    priority: 3,
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          textAlign: 'center'
        }
      };
    },
    isEditingText: true,
  },
  {
    id: 'align-right',
    label: 'Align Right',
    icon: AlignRight,
    blockTypes: ['text'],
    category: 'text',
    group: 'list-align',
    priority: 3,
    apply: (block) => {
      const textBlock = block as TextBlockType;
      return {
        content: {
          ...textBlock.content,
          textAlign: 'right'
        }
      };
    },
    isEditingText: true,
  }
];