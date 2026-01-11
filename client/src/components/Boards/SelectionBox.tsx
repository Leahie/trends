import { useData } from "@/context/data";
import { useEditor } from "@/context/editor";
import type { Block } from "@/types/types";
import { useEffect, useMemo, useState, useRef } from "react";

interface GroupMoveState {
    isActive: boolean;
    offsetX: number;
    offsetY: number;
}

interface SelectionBoxProps {
    selectionBox: {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null;
    scale: number;
    pan: {x:number; y:number};
    groupMoveState: GroupMoveState;
}

type HandleType = "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export default function SelectionBox({selectionBox, scale, pan, groupMoveState} :SelectionBoxProps){
    const {blocks, batchUpdateBlocks} = useData();
    const {setSelection, selectedBlockIds, pushToHistory} = useEditor();

    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<HandleType | null>(null);
    const [startMouse, setStartMouse] = useState({ x: 0, y: 0 });

    const initialState = useRef<{
        bounds: { minX: number; maxX: number; minY: number; maxY: number };
        blocks: Record<string, { x: number; y: number; width: number; height: number }>;
    } | null>(null);

    const selectionBounds = useMemo(()=>{
        if (!selectionBox) return null;
        
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);

        return { minX, maxX, minY, maxY };
    }, [selectionBox]);

    const isBlockIntersecting = (block: Block, bounds: { minX: number; maxX: number; minY: number; maxY: number }) => {
        const blockLeft = block.location.x;
        const blockRight = block.location.x + block.location.width;
        const blockTop = block.location.y;
        const blockBottom = block.location.y + block.location.height;

        return !(
            blockRight < bounds.minX ||
            blockLeft > bounds.maxX ||
            blockBottom < bounds.minY ||
            blockTop > bounds.maxY
        );
    }

    const intersectingBlockIds = useMemo(()=> {
        if (!selectionBounds) return [];

        return blocks
            .filter(block => isBlockIntersecting(block, selectionBounds))
            .map(block => block.id)
    }, [blocks, selectionBounds])

    useEffect(() => {
        if (selectionBox && intersectingBlockIds.length >= 0) {
            setSelection(intersectingBlockIds);
        }
    }, [intersectingBlockIds, selectionBox, setSelection]);

    const displayBounds = useMemo(() => {
        if (!selectionBounds) return null;

        return {
            left: selectionBounds.minX,
            top: selectionBounds.minY,
            width: selectionBounds.maxX - selectionBounds.minX,
            height: selectionBounds.maxY - selectionBounds.minY,
        };
    }, [selectionBounds]);

    // Get selected blocks
    const selectedBlocks = useMemo(() => {
        return blocks.filter(b => selectedBlockIds.includes(b.id));
    }, [blocks, selectedBlockIds]);

    const selectedBlocksBounds = useMemo(() => {
        if (selectedBlockIds.length === 0) return null;
        if (selectedBlocks.length === 0) return null;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        selectedBlocks.forEach(block => {
            // Apply group move offset if active
            const x = block.location.x + (groupMoveState.isActive ? groupMoveState.offsetX : 0);
            const y = block.location.y + (groupMoveState.isActive ? groupMoveState.offsetY : 0);
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x + block.location.width);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y + block.location.height);
        });
        
        return {
            left: Math.max(0, minX),
            top: Math.max(0, minY),
            width: maxX - minX,
            height: maxY - minY,
        };
    }, [selectedBlockIds, selectedBlocks, groupMoveState]);

    // Start group resize
    const startResize = (handle: HandleType) => (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!selectedBlocksBounds || selectedBlockIds.length <= 1) return;
        
        setIsResizing(true);
        setResizeHandle(handle);
        setStartMouse({ x: e.clientX, y: e.clientY });

        // Store initial state - use CURRENT bounds (which include any move offset)
        const bounds = {
            minX: selectedBlocksBounds.left,
            maxX: selectedBlocksBounds.left + selectedBlocksBounds.width,
            minY: selectedBlocksBounds.top,
            maxY: selectedBlocksBounds.top + selectedBlocksBounds.height,
        };

        initialState.current = {
            bounds,
            blocks: Object.fromEntries(
                selectedBlocks.map(block => [
                    block.id,
                    {
                        x: block.location.x,
                        y: block.location.y,
                        width: block.location.width,
                        height: block.location.height,
                    }
                ])
            )
        };
    };

    // Handle resize mouse move and mouse up
    useEffect(() => {
        if (!isResizing || !resizeHandle || !initialState.current) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = (e.clientX - startMouse.x) / scale;
            const dy = (e.clientY - startMouse.y) / scale;

            const initial = initialState.current!;
            const oldBounds = initial.bounds;
            const oldWidth = oldBounds.maxX - oldBounds.minX;
            const oldHeight = oldBounds.maxY - oldBounds.minY;
            const aspectRatio = oldWidth / oldHeight;

            let newBounds = { ...oldBounds };

            switch (resizeHandle) {
                case 'right':
                    newBounds.maxX = oldBounds.maxX + dx;
                    const newWidthRight = newBounds.maxX - newBounds.minX;
                    const newHeightRight = newWidthRight / aspectRatio;
                    const centerY = (oldBounds.minY + oldBounds.maxY) / 2;
                    newBounds.minY = centerY - newHeightRight / 2;
                    newBounds.maxY = centerY + newHeightRight / 2;
                    break;
                case 'left':
                    newBounds.minX = oldBounds.minX + dx;
                    const newWidthLeft = newBounds.maxX - newBounds.minX;
                    const newHeightLeft = newWidthLeft / aspectRatio;
                    const centerYLeft = (oldBounds.minY + oldBounds.maxY) / 2;
                    newBounds.minY = centerYLeft - newHeightLeft / 2;
                    newBounds.maxY = centerYLeft + newHeightLeft / 2;
                    break;
                case 'bottom':
                    newBounds.maxY = oldBounds.maxY + dy;
                    const newHeightBottom = newBounds.maxY - newBounds.minY;
                    const newWidthBottom = newHeightBottom * aspectRatio;
                    const centerX = (oldBounds.minX + oldBounds.maxX) / 2;
                    newBounds.minX = centerX - newWidthBottom / 2;
                    newBounds.maxX = centerX + newWidthBottom / 2;
                    break;
                case 'top':
                    newBounds.minY = oldBounds.minY + dy;
                    const newHeightTop = newBounds.maxY - newBounds.minY;
                    const newWidthTop = newHeightTop * aspectRatio;
                    const centerXTop = (oldBounds.minX + oldBounds.maxX) / 2;
                    newBounds.minX = centerXTop - newWidthTop / 2;
                    newBounds.maxX = centerXTop + newWidthTop / 2;
                    break;
                case 'top-left':
                    // Use average delta to maintain aspect ratio
                    const avgDeltaTL = (-dx - dy) / 2;
                    newBounds.minX = oldBounds.minX - avgDeltaTL*aspectRatio;
                    newBounds.minY = oldBounds.minY - avgDeltaTL;
                    break;
                case 'top-right':
                    // Use diagonal delta
                    const avgDeltaTR = (dx - dy) / 2;
                    newBounds.maxX = oldBounds.maxX + avgDeltaTR*aspectRatio;
                    newBounds.minY = oldBounds.minY - avgDeltaTR;
                    break;
                case 'bottom-left':
                    // Use diagonal delta
                    const avgDeltaBL = (dy - dx) / 2;
                    newBounds.minX = oldBounds.minX - avgDeltaBL*aspectRatio;
                    newBounds.maxY = oldBounds.maxY + avgDeltaBL;
                    break;
                case 'bottom-right':
                    // Use average delta for diagonal
                    const avgDeltaBR = (dx + dy) / 2;
                    newBounds.maxX = oldBounds.maxX + avgDeltaBR*aspectRatio;
                    newBounds.maxY = oldBounds.maxY + avgDeltaBR;
                    break;
            }

            const newWidth = newBounds.maxX - newBounds.minX;
            const newHeight = newBounds.maxY - newBounds.minY;
    

            // Prevent bounds from becoming too small
            const minSize = 100;
            if (newWidth < minSize || newHeight < minSize) return;

            // Calculate scale factors
            const scaleX = newWidth / oldWidth;
            const scaleY = newHeight / oldHeight;

            // Update all blocks proportionally
            const updates: Record<string, Partial<Block>> = {};

            selectedBlocks.forEach(block => {
                const initialBlock = initial.blocks[block.id];
                if (!initialBlock) return;

                // Calculate relative position within old bounds
                const relX = (initialBlock.x - oldBounds.minX) / oldWidth;
                const relY = (initialBlock.y - oldBounds.minY) / oldHeight;
                const relWidth = initialBlock.width / oldWidth;
                const relHeight = initialBlock.height / oldHeight;

                // Apply to new bounds
                const newX = newBounds.minX + (relX * newWidth);
                const newY = newBounds.minY + (relY * newHeight);
                const newBlockWidth = relWidth * newWidth;
                const newBlockHeight = relHeight * newHeight;

                updates[block.id] = {
                    location: {
                        ...block.location,
                        x: Math.max(0, newX),
                        y: Math.max(0, newY),
                        width: Math.max(50, newBlockWidth),
                        height: Math.max(50, newBlockHeight),
                    }
                };
            });

            batchUpdateBlocks(updates);
        };

        const handleMouseUp = () => {
            if (initialState.current) {
                // Save to history
                const before: Record<string, Block> = {};
                const after: Record<string, Block> = {};

                selectedBlocks.forEach(block => {
                    const initialBlock = initialState.current!.blocks[block.id];
                    if (initialBlock) {
                        before[block.id] = {
                            ...block,
                            location: {
                                ...block.location,
                                ...initialBlock
                            }
                        };
                        after[block.id] = block;
                    }
                });

                pushToHistory(before, after);
            }

            setIsResizing(false);
            setResizeHandle(null);
            initialState.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeHandle, startMouse, scale, selectedBlocks, batchUpdateBlocks, pushToHistory]);

    if (!selectionBox && !selectedBlocksBounds) return null;

    const showGroupControls = selectedBlockIds.length > 1 && selectedBlocksBounds;

    return(
        <>
            {/* Drawing Mode - selection rectangle as you drag */}
            {selectionBox && displayBounds && (
                <div
                    style={{
                        position: 'absolute',
                        left: `${displayBounds.left}px`,
                        top: `${displayBounds.top}px`,
                        width: `${displayBounds.width}px`,
                        height: `${displayBounds.height}px`,
                        border: '2px dashed rgba(59, 130, 246, 0.8)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        pointerEvents: 'none',
                        zIndex: 999,
                    }}
                />
            )}

            {/* Group Selection Outline + Resize Handles */}
            {showGroupControls && (
                <div 
                    style={{
                        position: 'absolute',
                        left: `${selectedBlocksBounds.left}px`,
                        top: `${selectedBlocksBounds.top}px`,
                        width: `${selectedBlocksBounds.width}px`,
                        height: `${selectedBlocksBounds.height}px`,
                        border: '3px solid rgba(59, 130, 246, 1)',
                        pointerEvents: 'none',
                        zIndex: 1001,
                        boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.5)',
                    }}
                >
                    {/* Resize handles - only show when not actively selecting */}
                    {!selectionBox && (
                        <>
                            <div 
                                className="resize-handle top top-bottom" 
                                onMouseDown={startResize("top")}
                                style={{ pointerEvents: 'auto' }}
                            />
                            <div 
                                className="resize-handle bottom top-bottom" 
                                onMouseDown={startResize("bottom")}
                                style={{ pointerEvents: 'auto' }}
                            />
                            <div 
                                className="resize-handle left left-right" 
                                onMouseDown={startResize("left")}
                                style={{ pointerEvents: 'auto' }}
                            />
                            <div 
                                className="resize-handle right left-right" 
                                onMouseDown={startResize("right")}
                                style={{ pointerEvents: 'auto' }}
                            />
                            
                            <div 
                                className="resize-handle diagonal top-left" 
                                onMouseDown={startResize("top-left")}
                                style={{ pointerEvents: 'auto' }}
                            />
                            <div 
                                className="resize-handle diagonal top-right" 
                                onMouseDown={startResize("top-right")}
                                style={{ pointerEvents: 'auto' }}
                            />
                            <div 
                                className="resize-handle diagonal bottom-left" 
                                onMouseDown={startResize("bottom-left")}
                                style={{ pointerEvents: 'auto' }}
                            />
                            <div 
                                className="resize-handle diagonal bottom-right" 
                                onMouseDown={startResize("bottom-right")}
                                style={{ pointerEvents: 'auto' }}
                            />
                        </>
                    )}
                </div>
            )}
        </>
    )
}