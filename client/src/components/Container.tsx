import type { BaseBlock } from "../types";
import DiaryBlock from "./DiaryBlock";
import Im

export default function Container({node} : {node: BaseBlock}){
    console.log(node["type"]);
    return(
    <div>
        {node["type"] === "text" && <p>"text"</p>}
        {node["type"] === "image" && <p>"image"</p>}
        {node["type"] === "diary_entry" && <p>"diary entry"</p>}

        
    </div>
        

    )
}