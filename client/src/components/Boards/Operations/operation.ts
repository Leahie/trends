import type { Block } from "@/types/types";
import { UNIVERSAL_OPERATIONS } from "./universal";
import { IMAGE_OPERATIONS } from "./image";
import { TEXT_OPERATIONS } from "./text";
import type { Operation } from "@/types/editorTypes";


export const ALL_OPERATIONS = [
  ...UNIVERSAL_OPERATIONS, 
  ...IMAGE_OPERATIONS, 
  // ...TEXT_OPERATIONS not used for now
]

export function getOperationsForBlock(blockType: Block['type'] | null): Operation[] {
  if (!blockType) return UNIVERSAL_OPERATIONS;
  
  return ALL_OPERATIONS.filter(op => op.blockTypes.includes(blockType) );
}