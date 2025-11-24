import { useParams, Navigate } from 'react-router-dom';
import { useData } from './context/data';
import type { Block, TextBlockType } from './types';
import TextInfo from './components/Info/TextInfo';
import ImageInfo from './components/Info/ImageInfo';

export default function BlockInfo(){
    const {id} = useParams();
    const {dataMap} = useData();

    if (!id ) return <Navigate to="/" replace />

    const node:Block = dataMap[id];

    if (!node) {
    return <Navigate to="/" replace />;
  }
    
    return(
        <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden">   
            <div className=' h-full w-full min-w-0 mt-[150px] ml-[20px] pb-[30vh] transition-transform duration-200 ease-linear translate-x-[calc(var(--direction,1)_*_0px)] ' >
            {node["type"] === "text" && <TextInfo  node={node as TextBlockType} />}
            {node["type"] === "image" && <ImageInfo />}
            {/* {node["type"] === "diary_entry" && <DiaryBlock id={node.id} type={node.type} properties={(node as DiaryBlockType).properties} content={(node as DiaryBlockType).content} parent={node.parent}/>} */}
            </div>
        </div>
    )
}