import {
  Crop, Palette, FlipHorizontal, FlipVertical
} from "lucide-react";
import type { Operation } from "@/types/editorTypes";
import type { ImageBlockType } from "@/types/types";

export const IMAGE_OPERATIONS: Operation[] = [
  {
    id: "crop",
    label: "Crop",
    icon: Crop,
    blockTypes: ["image"],
    requiresOverlay: true,
    category: "image",
    apply: (block, params) => {
      const imageBlock = block as ImageBlockType;
      return {
        content: {
          ...imageBlock.content,
          transforms: {
            ...imageBlock.content.transforms,
            crop: params.crop
          }
        }
      };
    }
  },
  {
    id: "flip-horizontal",
    label: "Flip Horizontal",
    icon: FlipHorizontal,
    blockTypes: ["image"],
    category: "image",
    apply: (block) => {
      const imageBlock = block as ImageBlockType;
      const currentFlip = imageBlock.content.transforms?.flip || { horizontal: false, vertical: false };
      return {
        content: {
          ...imageBlock.content,
          transforms: {
            ...imageBlock.content.transforms,
            flip: { ...currentFlip, horizontal: !currentFlip.horizontal }
          }
        }
      };
    }
  },
  {
    id: 'flip-vertical',
    label: 'Flip Vertical',
    icon: FlipVertical,
    blockTypes: ['image'],
    category: 'image',
    apply: (block) => {
      const imageBlock = block as ImageBlockType;
      const currentFlip = imageBlock.content.transforms?.flip || { horizontal: false, vertical: false };
      return {
        content: {
          ...imageBlock.content,
          transforms: {
            ...imageBlock.content.transforms,
            flip: {
              ...currentFlip,
              vertical: !currentFlip.vertical
            }
          }
        }
      };
    }
  },
  {
    id: 'grayscale',
    label: 'Grayscale',
    icon: Palette,
    blockTypes: ['image'],
    category: 'image',
    apply: (block) => {
      const imageBlock = block as ImageBlockType;
      const currentGrayscale = imageBlock.content.transforms?.grayscale || false;
      return {
        content: {
          ...imageBlock.content,
          transforms: {
            ...imageBlock.content.transforms,
            grayscale: !currentGrayscale
          }
        }
      };
    }
  },
  {
    id: 'opacity',
    label: 'Opacity',
    icon: Palette,
    blockTypes: ['image'],
    requiresOverlay: true,
    category: 'image',
    apply: (block, params) => {
      const imageBlock = block as ImageBlockType;
      return {
        content: {
          ...imageBlock.content,
          transforms: {
            ...imageBlock.content.transforms,
            opacity: params.opacity
          }
        }
      };
    }
  }
];
