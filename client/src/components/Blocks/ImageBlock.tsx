import type {ImageBlockType} from "@/types/types"
export default function ImageBlock({id, type, content, boardId}: ImageBlockType){
    return( 
        <div className="h-full w-full relative overflow-hidden">
                <img className="max-w-full max-h-full object-coverabsolute inset-0 w-full h-full object-cover object-center" src={content.url} draggable={false}/>
        </div>
    )
}