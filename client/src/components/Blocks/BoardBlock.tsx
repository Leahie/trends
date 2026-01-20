import type {BoardBlockType, Location} from "@/types/types"
import { useMemo } from "react";

type BoardBlockProps = BoardBlockType & {
  dims: Location;
  isDropTarget?: boolean;
  onDrop?: () => void;
};

export default function BoardBlock({content, dims, isDropTarget, onDrop}: BoardBlockProps){
    
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
        <div className=" flex flex-col h-full w-full border-light-accent border-t-5 border-b-10 border-r-10 relative"
        onMouseUp={isDropTarget ? onDrop : undefined}>
            
             <div className="absolute inset-y-0 left-1 w-1.5 -translate-x-1/2 bg-black/30 pointer-events-none"></div>


            {/* Drop overlay */}
            {isDropTarget && (
                <div className="absolute inset-0 bg-highlight/20 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-highlight border-dashed pointer-events-none">
                    <div className="bg-dark/90 px-6 py-3 rounded-lg border border-highlight">
                        <p className="text-heading font-semibold text-center">
                            Drop blocks to add to board
                        </p>
                    </div>
                </div>
            )}

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