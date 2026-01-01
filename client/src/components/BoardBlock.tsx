import type {BoardBlockType} from "../types.ts"
export default function BoardBlock({id, type, content}: BoardBlockType){
    return( 
        <div className=" flex flex-col h-full w-full border-light-accent border-t-5 border-b-10 border-r-10">
             <div className="absolute inset-y-0 left-1 w-[6px] -translate-x-1/2 bg-black/30 pointer-events-none"></div>

            <div className="flex-shrink-0 bg-accent">
                <h5 className="mb-3 text-2xl font-semibold tracking-tight text-heading leading-8 ">{content.title}</h5>
            </div>
            <hr />
            {/* elements inside of it*/}
            <div className="flex-1  diary-block">
                {/* <ul>
                    {content.map((e) => (
                        <li>{e.title}</li>
                    ))}
                </ul> */}
            </div>
        </div>
    )
}