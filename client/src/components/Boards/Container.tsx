import type { BaseBlock, BoardBlockType, ImageBlockType, TextBlockType,  } from "@/types/types";
import BoardBlock from "@/components/Blocks/BoardBlock";
import ImageBlock from "@/components/Blocks/ImageBlock";
import TextBlock from "@/components/Blocks/TextBlock";

export default function Container({node, dims, scale} : {node: BaseBlock, dims:any, scale:number}){
    return(
    <div className="h-full w-full">
        {node["type"] === "text" && <TextBlock {...(node as TextBlockType)} dims={dims} />}
        
        {node.type === "image" && (
        <ImageBlock
          {...(node as ImageBlockType)}
          dims={dims}
          scale={scale}
        />
      )}

        {node["type"] === "board_block" && <BoardBlock {...(node as BoardBlockType)} dims={dims}/>}
    </div>
        

    )
}