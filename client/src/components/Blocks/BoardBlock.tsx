import { useNavigate } from "react-router-dom";
import type {BoardBlockType} from "@/types/types"
import { useData } from "@/context/data";
import { useSidebar } from "@/context/sidebar";
export default function BoardBlock({id, type, content, linkedBoardId}: BoardBlockType){
    const navigate = useNavigate();
    const {setCurrentBoardId} = useData()
    const {openBoard,} = useSidebar();

    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.ctrlKey && linkedBoardId) {
            e.preventDefault();
            openBoard(id) // prevent default context menu
            navigate(`/boards/${linkedBoardId}`); // switch tab
        }
    };

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