// Updated ResizableContainer.tsx to account for subtitle overflow
import type {Block, Location} from "@/types/types"
import {useState, useEffect, useRef} from "react";
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

interface GroupMoveState {
    isActive: boolean;
    offsetX: number;
    offsetY: number;
}

export default function ResizeableContainer({node, blockLocation, scale, onSelected,
    bringToFront, shouldResize, zoomToBlock, groupMoveState, onGroupMove, isDropTarget, onBoardBlockDrop,
    isDraggingOverBoard, onSingleBlockMove
}: {node: Block,
    blockLocation: Location,
    scale: number,
    onSelected: () => void,
    bringToFront: (x: string[]) => void,
    shouldResize: boolean,
    zoomToBlock: (x:Block) => void,
    groupMoveState: GroupMoveState,
    onGroupMove: (offsetX: number, offsetY: number, isMoving: boolean) => void, 
    isDropTarget: boolean, 
    onBoardBlockDrop: () => void;
    isDraggingOverBoard: boolean,
    onSingleBlockMove: (offsetX: number, offsetY: number, isMoving: boolean) => void
},
){
    if (!node) return null;
    const {updateBlock, batchUpdateBlocks, blocks} = useData();
    const { selectedBlockIds, setIsEditingText, setEditingBlockId, editingBlockId, pushToHistory } = useEditor();
    const selected = selectedBlockIds.includes(node.id);
    const isMultiSelected = selectedBlockIds.length > 1 && selected;
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

    const moveStartPosition = useRef<{x: number, y: number}>(null);

    // Check if this block has a subtitle
    const hasSubtitle = node.type === "image" && node.content.subtitle;

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
                if (isMultiSelected && move.active) {
                    const updates: Record<string, Partial<Block>> = {};
                    const before: Record<string, Block> = {};
                    const after: Record<string, Block> = {};

                    selectedBlockIds.forEach(id => {
                        const block = blocks.find(b => b.id === id);
                        if (!block) return;

                        before[id] = { ...block };

                        const newX = block.location.x + groupMoveState.offsetX;
                        const newY = block.location.y + groupMoveState.offsetY;

                        updates[id] = {
                            location: {
                                ...block.location,
                                x: newX,
                                y: newY
                            }
                        };

                        after[id] = {
                            ...block,
                            location: {
                                ...block.location,
                                x: newX,
                                y: newY
                            }
                        };
                    });
                    batchUpdateBlocks(updates);
                    pushToHistory(before, after);

                    onGroupMove(0,0,false);
                }
                else{
                    const before: Record<string, Block> = { [node.id]: { ...node } };
                    const after: Record<string, Block> = { 
                        [node.id]: { 
                            ...node, 
                            location: dims 
                        } 
                    };

                    const moved =
                        node.location.x !== dims.x ||
                        node.location.y !== dims.y ||
                        node.location.width !== dims.width ||
                        node.location.height !== dims.height ||
                        node.location.rotation !== dims.rotation ||
                        node.location.scaleX !== dims.scaleX ||
                        node.location.scaleY !== dims.scaleY;

                    if (moved) {
                        updateBlock(node.id, { location: dims });
                        pushToHistory(before, after);
                    }

                    // Reset single block move tracking
                    if (!isMultiSelected) {
                        onSingleBlockMove(0, 0, false);
                    }
                }
                moveStartPosition.current = null;
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

    const startMove = (e: React.MouseEvent) => {
        if (!isEditMode) return;
        if (e.button !== 0) return;
        onSelected();
        moveStartPosition.current = {
            x: blockLocation.x,
            y: blockLocation.y
        };

        setMove({
            active: true, 
            x: e.clientX, 
            y: e.clientY
        });

        if (isMultiSelected) {
            onGroupMove(0, 0, true);
        }
    }

    const moveFrame = (e: MouseEvent) => {
        if (!isEditMode || !shouldResize ) return;
        if (isThisTextBlockEditing) return;
        if (!move.active) return; 
        if (!moveStartPosition.current) return;

        const start = moveStartPosition.current;
        if (!start || start.x == null || start.y == null) return;

        const totalDx = (e.clientX - move.x) / scale;
        const totalDy = (e.clientY - move.y) / scale;

        if (isMultiSelected) {
            onGroupMove(totalDx, totalDy, true);
            
            setDims(prev => ({
            ...prev,
            x: start.x + totalDx,
            y: start.y + totalDy,
            }));
        } else {
            // For single block moves, track the offset for drop detection
            onSingleBlockMove(totalDx, totalDy, true);
            
            setDims(prev => {
            const newX = start.x + totalDx;
            const newY = start.y + totalDy;
            return { ...prev, x: newX, y: newY };
            });
        }
    }

    const startResize = (drag: HandleType) => (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelected();

        if (isMultiSelected) return;

        setDrag({
            active: true, 
            handle: drag, 
            x: e.clientX,
            y: e.clientY 
        });
    };
    
    const resizeFrame = (e: MouseEvent) => {
        const {active, handle} = drag;
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
                if (handle === "right") {
                    w += dx;
                    h = w / aspectRatio;
                    y = prev.y + prev.height / 2 - h / 2;
                } else if (handle === "left") {
                    w -= dx;
                    h = w / aspectRatio;
                    x = prev.x + prev.width - w;
                    y = prev.y + prev.height / 2 - h / 2;
                } else if (handle === "bottom") {
                    h += dy;
                    w = h * aspectRatio;
                    x = prev.x + prev.width / 2 - w / 2;
                } else if (handle === "top") {
                    h -= dy;
                    w = h * aspectRatio;
                    y = prev.y + prev.height - h;
                    x = prev.x + prev.width / 2 - w / 2;
                } else if (handle === "top-left") {
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
        
            // Allow negative coordinates
            // x and y can be negative

            return { ...prev, x:x, y:y, width: w, height: h };
        })

        setDrag(prev => ({
            ...prev, x: e.clientX, 
            y: e.clientY
        }))
    }

    const handleMouseMove = (e: MouseEvent) =>{
        if (drag.active){
            resizeFrame(e);
        }
        if (move.active === true){
            moveFrame(e);
        }
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (node.type === "text") {
            setIsEditingText(true);
            setEditingBlockId(node.id);
            onSelected();

            setTimeout(() => {
            // The TextBlock component will handle focus
        }, 0);
        }
        if (node.type == "image"){
            zoomToBlock(node);
        }
    };

    const visualX = isMultiSelected && groupMoveState.isActive 
        ? blockLocation.x + groupMoveState.offsetX
        : dims.x;
    
    const visualY = isMultiSelected && groupMoveState.isActive
        ? blockLocation.y + groupMoveState.offsetY
        : dims.y;

    const boxStyle = {
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        top: `${visualY}px`,      
        left: `${visualX}px`,    
        zIndex: selected ? 1000 : dims.zIndex, 
        overflow: isThisTextBlockEditing ? "visible" : (hasSubtitle ? "visible" : "hidden"),
        userSelect: "none" as const
    };

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
    const showResizeHandles = selected && !isMultiSelected;

    return(     
        <div 
            data-block-id={node.id} 
            className={`absolute flex flex-col ${node.type == "text" && "text-block"} ${selected && isEditMode ? "outline-2 outline-blue-500 " : ""}`} 
            style={{...boxStyle, ...blockTheme}} 
            onMouseMove={() => handleMouseMove} 
            onClick={(e)=>{
                if (!shouldResize) return;
                e.stopPropagation(); 
                if (isEditMode) {
                    onSelected();
                } else if (node.type == "board_block"){
                    navigate(`/boards/${node.linkedBoardId}`)
                }
            }}
            onDoubleClick={handleDoubleClick}
        >
            <div
                className="absolute inset-0"
                onMouseDown={(e) => {
                    if (!shouldResize) return;
                    if (isThisTextBlockEditing && node.type === "text") {
                        e.stopPropagation();
                        return;
                    }
                    e.stopPropagation();
                    bringToFront([node.id]);
                    startMove(e);
                }}
            >
                <Container node={node} dims={dims} isDropTarget={isDropTarget} onBoardBlockDrop={onBoardBlockDrop} isDraggingOverBoard={isDraggingOverBoard}/>
            </div>

            {showResizeHandles && (
                <>
                    <div className="resize-handle top top-bottom" onMouseDown={startResize("top")} />
                    <div className="resize-handle bottom top-bottom" onMouseDown={startResize("bottom")} />
                    <div className="resize-handle left left-right" onMouseDown={startResize("left")} />
                    <div className="resize-handle right left-right" onMouseDown={startResize("right")} />
                    
                    <div className="resize-handle diagonal top-left" onMouseDown={startResize("top-left")} />
                    <div className="resize-handle diagonal top-right" onMouseDown={startResize("top-right")} />
                    <div className="resize-handle diagonal bottom-left" onMouseDown={startResize("bottom-left")} />
                    <div className="resize-handle diagonal bottom-right" onMouseDown={startResize("bottom-right")} />
                </>
            )}
        </div>
    )
}