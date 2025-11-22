import type {Block, BasePageBlock} from "../types";
import ResizeableContainer from "./ResizeableContainer.tsx"

export default function({node, dataMap}: {node: BasePageBlock, dataMap: Record<string, Block>}){
    return(
        <div>
            <h1>
                {node.properties.title}
            </h1>
            <div>
                {
                    node.content.map(e => (<ResizeableContainer node={dataMap.e}/>))
                }
            </div>
        </div>
        
    )
}