import type { BaseBlock, DiaryBlockType, ImageBlockType, TextBlockType,  } from "../types";
import BoardBlock from "@/components/Blocks/BoardBlock";
import ImageBlock from "@/components/Blocks/ImageBlock";
import TextBlock from "@/components/Blocks/TextBlock";

export default function Container({node} : {node: BaseBlock}){
    return(
    <div className="h-full w-full">
        {node["type"] === "text" && <TextBlock id = {node.id} type={node.type} properties={(node as TextBlockType).properties} parent={node.parent} />}
        {node["type"] === "image" && <ImageBlock id = {node.id} type={node.type} properties={(node as ImageBlockType).properties} parent={node.parent}/>}
        {node["type"] === "diary_entry" && <BoardBlock id={node.id} type={node.type} properties={(node as DiaryBlockType).properties} content={(node as DiaryBlockType).content} parent={node.parent}/>}
    </div>
        

    )
}