import type {Block} from "../types.ts";
import {useState, useEffect} from 'react';  // will be used later when we fetch data 

interface SidebarNodeProps{
    node: Block;
    dataMap:  Record<string, Block>
}

function SidebarNode({node, dataMap}: SidebarNodeProps){
    return(
        <div className="flex-col">
        <li>{node.properties.title}</li>
        { "content" in node && node.content.length > 0 && (
        <ol className="pl-2">
            {node.content.map((childId:string) => <SidebarNode node={dataMap[childId]} dataMap={dataMap} />)}
        </ol>)
        }
        </div>
    )
}

export default function Sidebar({node, dataMap}: {node: Block, dataMap: Record<string, Block>}){

    return(
        <div className="absolute left-0 px-5 text-left bg-indigo-50 ">
        <ol>
            <SidebarNode key={node.id} node={node} dataMap={dataMap}/>
        </ol>
        </div>
    )
}