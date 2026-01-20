import type { BaseBlock, BoardBlockType, ImageBlockType, TextBlockType,  } from "@/types/types";
import BoardBlock from "@/components/Blocks/BoardBlock";
import ImageBlock from "@/components/Blocks/ImageBlock";
import TextBlock from "@/components/Blocks/TextBlock";
import { useEditor } from "@/context/editor";

export default function Container({node, dims, isDropTarget, onBoardBlockDrop, isDraggingOverBoard} : 
  {node: BaseBlock, 
    dims:any, 
    isDropTarget?: boolean, 
     onBoardBlockDrop?: () => void;
     isDraggingOverBoard?: boolean;
}){
  const {selectedBlockIds} = useEditor();
    return(
    <div className={`h-full w-full ${isDraggingOverBoard && selectedBlockIds.includes(node.id)  ? "opacity-50" : ""} `}>
        {node["type"] === "text" && <TextBlock {...(node as TextBlockType)} dims={dims} />}
        
        {node.type === "image" && (
        <ImageBlock
          {...(node as ImageBlockType)}
          dims={dims}
        />
      )}

        {node["type"] === "board_block" && <BoardBlock {...(node as BoardBlockType)} dims={dims} isDropTarget={isDropTarget} onDrop={onBoardBlockDrop}/>}
    </div>
        

    )
}