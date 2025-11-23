import type {DiaryBlockType} from "../types.ts"
export default function DiaryBlock({id, type, properties, content, parent}: DiaryBlockType){
    return( 
        <div>
            <a className="bg-slate-50 text-black">
                <h5 className="mb-3 text-2xl font-semibold tracking-tight text-heading leading-8 ">{properties.title}</h5>
            </a>
        </div>
    )
}