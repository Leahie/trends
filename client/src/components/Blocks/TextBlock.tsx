import type {TextBlockType} from "@/types/types"
export default function TextBlock({id, type, content, boardId}: TextBlockType){
    return( 
        <div className=" bg-highlight p-5 h-full w-full flex flex-col text-left border-x-4 border-b-8 border-dark">
                <p className="text-body text-[15px] flex-1 text-ellipsis ">{content.body}</p>
                <h5 className="font-bold mb-3 text-[10px] text-light-accent leading-8 flex-shrink-0 ">{content.title}</h5>

        </div>
    )
}