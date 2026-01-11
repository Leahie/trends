import type {Block, Location} from "@/types/types"
import {useState, useEffect} from "react";
import Container from "./Container";
import { useNavigate } from "react-router-dom";
import {useData} from "@/context/data.tsx"
import { useEditor } from "@/context/editor.tsx";
import { generateScheme, schemeToCSSVars } from "@/utils/theme";


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

export default function ResizeableContainer({node, blockLocation, scale, onSelected,
    bringToFront, shouldResize, zoomToBlock
}: {node: Block, blockLocation: Location, scale: number, onSelected: () => void,
    bringToFront: (x: string) => void, shouldResize: boolean,
    zoomToBlock: (x:Block) => void
},
){
    if (!node) return null;
    const {updateBlock} = useData();
    const { selectedBlockIds, setIsEditingText, setEditingBlockId, isEditingText, editingBlockId, pushToHistory } = useEditor();
    const selected = selectedBlockIds.includes(node.id);
    const isThisTextBlockEditing = editingBlockId === node.id;

    const navigate = useNavigate();
    const [dims, setDims] = useState<Location>(blockLocation);
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
            if (e.ctrlKey || e.metaKey) {
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
            if (drag.active || move.active) {
                const before = node;
                updateBlock(node.id, {location:dims});

                if (before != node)
                    pushToHistory(node.id, before, node) // probably wrong
            }
            setDrag((d) => ({ ...d, active: false, handle: null }));
            setMove((m) => ({ ...m, active: false }));
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (drag.active) {
                resizeFrame(e);
            } else if (move.active) {
                moveFrame(e);
            }
        };

        if (drag.active || move.active) {
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("mousemove", handleMouseMove);

            return () => {
                window.removeEventListener("mouseup", handleMouseUp);
                window.removeEventListener("mousemove", handleMouseMove);
            };
        }
    }, [drag.active, move.active, drag.handle, drag.x, drag.y, move.x, move.y, dims, node.id]);

    // MOVING
    const startMove = (e: React.MouseEvent) => {
        if (!isEditMode) return;
        onSelected();
        setMove({
            active: true, 
            x: e.clientX, 
            y: e.clientY
        })
    }

    const moveFrame = (e: MouseEvent) => {
        if (!isEditMode || !shouldResize ) return;
        if (isThisTextBlockEditing) return;
        if (!move.active) return; 
        const dx = (e.clientX - move.x)/scale;
        const dy = (e.clientY - move.y)/scale;

        setDims(prev => { 
            const newX = Math.max(0, prev.x+dx);
            const newY = Math.max(0, prev.y+dy);
            return { ...prev, x: newX, y: newY };
        })

        setMove(prev => ({
            ...prev, x: e.clientX, 
            y: e.clientY
        }))
    }

    // START AND STOP THE RESIZING
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
    
    const resizeFrame = (e: MouseEvent) => {
        const {active, handle, x, y} = drag;
        if (!active) return; 
        const dx = (e.clientX - drag.x) / scale;
        const dy = (e.clientY - drag.y) / scale;

        setDims(prev => {
            const isImageBlock = node.type === "image";
            
            let x = prev.x;
            let y = prev.y;
            let w = prev.width; 
            let h = prev.height;

            let aspectRatio = prev.width/prev.height;
            if (isImageBlock) {
                // aspectRatio = node.content.imgWidth/node.content.imgHeight;
                // if (node.content.transforms?.crop){
                //     aspectRatio = node.content.transforms.crop.widthRatio / node.content.transforms.crop.heightRatio;
                // }

                // For images, maintain aspect ratio and anchor to opposite side
                if (handle === "right") {
                    w += dx;
                    h = w / aspectRatio;
                    y = prev.y + prev.height / 2 - h / 2; // Center vertically
                } else if (handle === "left") {
                    w -= dx;
                    h = w / aspectRatio;
                    x = prev.x + prev.width - w;
                    y = prev.y + prev.height / 2 - h / 2; // Center vertically
                } else if (handle === "bottom") {
                    h += dy;
                    w = h * aspectRatio;
                    x = prev.x + prev.width / 2 - w / 2; // Center horizontally
                } else if (handle === "top") {
                    h -= dy;
                    w = h * aspectRatio;
                    y = prev.y + prev.height - h;
                    x = prev.x + prev.width / 2 - w / 2; // Center horizontally
                } else if (handle === "top-left") {
                    // Diagonal: use average of dx and dy to maintain aspect ratio
                    const avgDelta = (dx + dy) / 2;
                    w -= avgDelta * aspectRatio;
                    h -= avgDelta;
                    x = prev.x + prev.width - w;
                    y = prev.y + prev.height - h;
                } else if (handle === "top-right") {
                    const avgDelta = (dx - dy) / 2;
                    w += avgDelta * aspectRatio;
                    h += avgDelta;
                    y = prev.y + prev.height - h;
                } else if (handle === "bottom-left") {
                    const avgDelta = (dy - dx) / 2;
                    w += avgDelta * aspectRatio;
                    h += avgDelta;
                    x = prev.x + prev.width - w;
                } else if (handle === "bottom-right") {
                    const avgDelta = (dx + dy) / 2;
                    w += avgDelta * aspectRatio;
                    h += avgDelta;
                }
            } else {
                // Original behavior for non-image blocks
                if (handle === "right") w += dx;
                if (handle === "left") {
                    x += dx;
                    w -= dx;
                }
                if (handle === "bottom") h += dy;
                if (handle === "top") {
                    y += dy;
                    h -= dy;
                }
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
                    x += dx; 
                    w -= dx;
                    h += dy;
                }
                if (handle === "bottom-right") {
                    w += dx;
                    h += dy;
                }
            }
            const minWidth = 50; 
            const minHeight = 50; 
            if (w < minWidth) {
                if (isImageBlock) {
                    w = minWidth;
                    h = w / aspectRatio;
                    if (handle?.includes("left")) {
                        x = prev.x + prev.width - w;
                    }
                    if (handle === "top" || handle === "bottom") {
                        x = prev.x + prev.width / 2 - w / 2;
                    }
                } else {
                    if (drag.handle?.includes("left")) {
                        x = prev.x + prev.width - minWidth;
                    }
                    w = minWidth;
                }
            }
            if (h < minHeight) {
                if (isImageBlock) {
                    h = minHeight;
                    w = h * aspectRatio;
                    if (handle?.includes("top")) {
                        y = prev.y + prev.height - h;
                    }
                    if (handle === "left" || handle === "right") {
                        y = prev.y + prev.height / 2 - h / 2;
                    }
                } else {
                    if (drag.handle?.includes("top")) {
                        y = prev.y + prev.height - minHeight;
                    }
                    h = minHeight;
                }
            }
        
            x = Math.max(0, x);
            y = Math.max(0, y);

            return { ...prev, x:x, y:y, width: w, height: h };
        })

        setDrag(prev => ({
            ...prev, x: e.clientX, 
            y: e.clientY
        }))
    }

    const handleMouseMove = (e: MouseEvent) =>{
        if (!shouldResize) return;
        if (drag.active){
            resizeFrame(e);
        }
        if (move.active === true){
            moveFrame(e);
        }
    }

    // Double clicking on text blocks result in entering edit mode 
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === "text") {
            setIsEditingText(true);
            setEditingBlockId(node.id);
            onSelected();
        }
        if (node.type == "image"){
            zoomToBlock(node);
        }
    };

    // This is the box style 
    const boxStyle = {
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        top: `${dims.y}px`, 
        left: `${dims.x}px`,
        zIndex: selected ? 1000 : dims.zIndex, 
        overflow: isThisTextBlockEditing ? "visible" : "hidden",
        userSelect: "none"
    };

    // Location Syncing
    useEffect(() => {
        if (blockLocation.zIndex !== dims.zIndex) {
            setDims(prev => ({...prev, zIndex: blockLocation.zIndex}));
        }
        
        if (!drag.active && !move.active) {
            if (blockLocation.x !== dims.x || 
                blockLocation.y !== dims.y || 
                blockLocation.width !== dims.width || 
                blockLocation.height !== dims.height) {
                setDims(blockLocation);
            }
        }
    }, [blockLocation, drag.active, move.active]);


    const scheme = node.type == "text" && node.content.bgColor ? generateScheme(node.content.bgColor) : null;
    
    const blockTheme = scheme ? schemeToCSSVars(scheme) : undefined;
    

    return(     
        <div className={`absolute  ${node.type == "text" && "text-block"}  ${selected && isEditMode ? "outline outline-2 outline-blue-500 " : ""}
        `} 
            style={{...boxStyle, ...blockTheme} }  onMouseMove={() => handleMouseMove} 
            onClick={(e)=>{
                if (!shouldResize) return;
                e.stopPropagation(); 
                if (isEditMode) {
                    onSelected();
                } else if (node.type == "board_block"){
                    navigate(`/boards/${node.linkedBoardId}`)
                }
            }}
            onDoubleClick={handleDoubleClick}>
            <div
                className="absolute inset-0 "
                onMouseDown={(e) => {
                    if (!shouldResize) return;
                    e.stopPropagation();
                    // Call bringToFront but DON'T await it
                    bringToFront(node.id);
                    // Immediately start the move so event listeners are set up
                    startMove(e);
                }}
            >
                <Container node={node} dims={dims} scale={scale} />
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