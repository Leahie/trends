import type { BaseBlock, DiaryBlockType, ImageBlockType, TextBlockType,  } from "../types";
import DiaryBlock from "./DiaryBlock";
import ImageBlock from "./ImageBlock";
import TextBlock from "./TextBlock";

export default function Container({node} : {node: BaseBlock}){
    return(
    <div className="h-full w-full">
        {node["type"] === "text" && <TextBlock id = {node.id} type={node.type} properties={(node as TextBlockType).properties} parent={node.parent} />}
        {node["type"] === "image" && <ImageBlock id = {node.id} type={node.type} properties={(node as ImageBlockType).properties} parent={node.parent}/>}
        {node["type"] === "diary_entry" && <DiaryBlock id={node.id} type={node.type} properties={(node as DiaryBlockType).properties} content={(node as DiaryBlockType).content} parent={node.parent}/>}
    </div>
        

    )
}