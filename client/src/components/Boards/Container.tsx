import type { BaseBlock, BoardBlockType, ImageBlockType, TextBlockType,  } from "@/types";
import BoardBlock from "@/components/Blocks/BoardBlock";
import ImageBlock from "@/components/Blocks/ImageBlock";
import TextBlock from "@/components/Blocks/TextBlock";

export default function Container({node} : {node: BaseBlock}){
    return(
    <div className="h-full w-full">
        {node["type"] === "text" && <TextBlock {...(node as TextBlockType)} />}
        {node["type"] === "image" && <ImageBlock {...(node as ImageBlockType)}/>}
        {node["type"] === "board_block" && <BoardBlock {...(node as BoardBlockType)}/>}
    </div>
        

    )
}