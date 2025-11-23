import type {ImageBlockType} from "../types.ts"
export default function ImageBlock({id, type, properties, parent}: ImageBlockType){
    return( 
        <div className="h-full w-full relative overflow-hidden">
                <img className="max-w-full max-h-full object-coverabsolute inset-0 w-full h-full object-cover object-center" src={properties.url} draggable={false}/>
        </div>
    )
}