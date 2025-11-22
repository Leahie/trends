import type {Block, BasePageBlock, BlockSize} from "../types";
import ResizeableContainer from "./ResizeableContainer.tsx"
import rawBlockStates from "../data/block_states.json"
import {useState} from 'react';

export default function({node, dataMap}: {node: BasePageBlock, dataMap: Record<string, Block>}){
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const blockStates = rawBlockStates as Record<string, BlockSize>;
    return(
        <div onClick = {() => setSelectedBlockId(null)}>
            <h1>
                {node.properties.title}
            </h1>
            <div className="relative w-screen h-screen">
                {
                    node.content.map((e:string) => {
                        console.log(e);
                        return <ResizeableContainer node={dataMap[e]} blockLocation={blockStates[e]} selected = {selectedBlockId == e} onSelected={() => setSelectedBlockId(e)}/>
                    })
                }
            </div>
        </div>
        
    )
}