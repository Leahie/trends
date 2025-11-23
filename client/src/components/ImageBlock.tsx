import type {ImageBlockType} from "../types.ts"
export default function ImageBlock({id, type, properties, parent}: ImageBlockType){
    return( 
        <div>
            <div>
            <a className="bg-slate-50 text-black">
                <h5 className="mb-3 text-2xl font-semibold tracking-tight text-heading leading-8 ">{properties.title}</h5>
                <img src={properties.url} draggable={false}/>
            </a>
        </div>
        </div>
    )
}