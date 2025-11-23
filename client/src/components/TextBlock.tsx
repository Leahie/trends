import type {TextBlockType} from "../types.ts"
export default function ImageBlock({id, type, properties, parent}: TextBlockType){
    return( 
        <div>
            <a className="bg-slate-50 text-black">
                <h5 className="mb-3 text-2xl font-semibold tracking-tight text-heading leading-8 ">{properties.title}</h5>
                <p className="text-body overflow-hidden text-ellipsis ">{properties.body}</p>
            </a>
        </div>
    )
}