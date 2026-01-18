import type {BoardBlockType, Location} from "@/types/types"
import { useMemo } from "react";

type BoardBlockProps = BoardBlockType & {
  dims: Location;
};

export default function BoardBlock({content, dims}: BoardBlockProps){
    
    const fontSizeMultiplier = useMemo(() => {
            const avgDimension = (dims.width + dims.height) / 2;
            // Base: 200px = 1x, scales linearly
            return Math.max(0.5, Math.min(3, avgDimension / 200));
        }, [dims.width, dims.height]);
    

    // Context menu functionality for board blocks
    // const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    //     if (e.ctrlKey && linkedBoardId) {
    //         e.preventDefault();
    //         openBoard(id) // prevent default context menu
    //         navigate(`/boards/${linkedBoardId}`); // switch tab
    //     }
    // };

    return( 
        <div className=" flex flex-col h-full w-full border-light-accent border-t-5 border-b-10 border-r-10">
             <div className="absolute inset-y-0 left-1 w-1.5 -translate-x-1/2 bg-black/30 pointer-events-none"></div>

            <div className="shrink-0 bg-accent">
                <h5 
                style={{ fontSize: `${15 * fontSizeMultiplier}px`, padding: `${10 * fontSizeMultiplier}px`}}
                
                className="mb-3  font-semibold tracking-tight text-heading leading-8 ">{content.title}</h5>
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