import type { Block } from "@/types/types";
import { UNIVERSAL_OPERATIONS } from "./universal";
import { IMAGE_OPERATIONS } from "./image";
import { TEXT_OPERATIONS } from "./text";
import type { Operation } from "@/types/editorTypes";


export const ALL_OPERATIONS = [
  ...UNIVERSAL_OPERATIONS, 
  ...IMAGE_OPERATIONS, 
  ...TEXT_OPERATIONS 
]

export function getOperationsForBlockTypes(
  blockTypes: Set<Block["type"]>,
  multiSelection: boolean
  ): Operation[] {
  if (blockTypes.size === 0) return UNIVERSAL_OPERATIONS;
  console.log(blockTypes, multiSelection)
  return ALL_OPERATIONS.filter(op =>{
    console.log(op)
    return ([...blockTypes].some(type => op.blockTypes.includes(type))
    && (multiSelection ? op.multiSelection : true))}
  );
}
