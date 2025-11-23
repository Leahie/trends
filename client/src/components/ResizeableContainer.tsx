import type {Block, BlockSizeType} from "../types"
import {useState, useEffect} from "react";
import Container from "./Container";

type HandleType = "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | null;


interface DragTypes{
    active: boolean, 
    handle: HandleType, 
    x: number, 
    y: number
}

interface MoveTypes{
    active: boolean, 
    x: number, 
    y: number
}

export default function ResizeableContainer({node, blockLocation, selected, onSelected}: {node: Block, blockLocation: BlockSizeType, selected: boolean, onSelected: () => void}){
    const [dims, setDims] = useState<BlockSizeType>(blockLocation);
    const [isEditMode, setIsEditMode] = useState(true);

    const [drag, setDrag] = useState<DragTypes>({
        active: false,
        handle: null,
        x: 0, 
        y: 0
    });

    const [move, setMove] = useState<MoveTypes>({
        active: false,
        x: 0, 
        y: 0
    })

    // Track modifier key state
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) { // Ctrl on Windows/Linux, Cmd on Mac
                setIsEditMode(false);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!e.ctrlKey && !e.metaKey) {
                setIsEditMode(true);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    useEffect(() => {
        
    const handleMouseUp = () => {
        
        setDrag(d => ({ ...d, active: false, handle: null }));
        setMove(m => ({...m, active: false}));
        console.log("mouse up");
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (drag.active) {
            resizeFrame(e);
        } else if (move.active) {
            resizeFrame(e);
        }
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("mousemove", handleMouseMove);
    };
}, [drag.active, move.active, drag.handle, drag.x, drag.y, move.x, move.y]);


    // MOVING !! 
    const startMove = (e: React.MouseEvent) => {
        if (!isEditMode) return;
        e.stopPropagation();
        onSelected();
        setMove({
            active: true, 
            x: e.clientX, 
            y:e.clientY
        })
    }

    const moveFrame = (e: React.MouseEvent) => {
        if (!isEditMode) return;
        if (!move.active) return; 
        const dx = e.clientX - move.x;
        const dy = e.clientY - move.y;

        setDims(prev => { 
            const newX = Math.max(0, prev.x+dx);
            const newY = Math.max(0, prev.y+dy);
            return { ...prev, x: newX, y: newY };
        })

        setMove(prev => ({
            ...prev, x: e.clientX, 
            y:e.clientY
        }))

    }


    // START AND STOP THE RESIZING !!!! 
    const startResize = (drag: HandleType) => (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelected();

        setDrag({
            active: true, 
            handle: drag, 
            x: e.clientX,
            y: e.clientY 
        });
    };
    
    const resizeFrame = (e: React.MouseEvent) => {
        const {active, handle, x, y} = drag;
        if (!active) return; 
        const dx = e.clientX - x;
        const dy = e.clientY - y;

        setDims(prev => {
            let x = prev.x;
            let y = prev.y;
            let w = prev.width; 
            let h = prev.height; 

            // horizontal handles
            if (handle === "right") w += dx;
            if (handle === "left") {
                x +=dx;
                w -= dx;
            }

            // vertical handles
            if (handle === "bottom") h += dy;
            if (handle=== "top"){
                y += dy;
                h -= dy;
            }
            // diagonal handles
            if (handle === "top-left") {
                y += dy;
                x += dx;
                w -= dx;
                h -= dy;
            }
            if (handle === "top-right") {
                y += dy;
                w += dx;
                h -= dy;
            }
            if (handle === "bottom-left") {
                x +=dx; 
                w -= dx;
                h += dy;
            }
            if (handle === "bottom-right") {
                w += dx;
                h += dy;
            }
            const minWidth = 50; 
            const minHeight = 50; 
            if (w < minWidth) {
                if (drag.handle?.includes("left")) {
                    x = prev.x + prev.width - minWidth;
                }
                w = minWidth;
            }
            if (h < minHeight) {
                if (drag.handle?.includes("top")) {
                    y = prev.y + prev.height - minHeight;
                }
                h = minHeight;
            }
        
            x = Math.max(0, x);
            y = Math.max(0, y);
        

            

            return { ...prev, x:x, y:y, width: w, height: h };
        })

        setDrag(prev => ({
            ...prev, x: e.clientX, 
            y:e.clientY
        }))

    }
    const handleMouseMove = (e: React.MouseEvent) =>{

        if (drag.active){
            resizeFrame(e);
        }
        if (move.active === true){
            moveFrame(e);
        }
    }

    // This is the box style 
    const boxStyle = {
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        top: `${dims.y}px`, 
        left: `${dims.x}px`,
        zIndex: selected ? 1000 : dims.zIndex, 
        overflow: "hidden",
        userSelect: "none"
    };



    return(     
    <div className={`absolute resizeable ${node.type == "text" && "text-block"}  ${selected && isEditMode ? "outline outline-2 outline-blue-500 " : ""}`} 
        style={boxStyle} onMouseMove={handleMouseMove} 
        onClick={(e)=>{e.stopPropagation(); if (isEditMode) {
            // In edit mode, just select
            onSelected();
        } }}>
        <div
            className="absolute inset-0 "
            onMouseDown={startMove}
        >
            <Container node={node} />
            </div>

        <div className="resize-handle top top-bottom"   onMouseDown={startResize("top")} />
        <div className="resize-handle bottom top-bottom"  onMouseDown={startResize("bottom")} />
        <div className="resize-handle left left-right" onMouseDown={startResize("left")} />
        <div className="resize-handle right left-right" onMouseDown={startResize("right")} />
        
        <div className="resize-handle diagonal top-left" onMouseDown={startResize("top-left")} />
        <div className="resize-handle diagonal top-right" onMouseDown={startResize("top-right")}  />
        <div className="resize-handle diagonal bottom-left" onMouseDown={startResize("bottom-left")}/>
        <div className="resize-handle diagonal bottom-right" onMouseDown={startResize("bottom-right")} />


    </div>
    )
}