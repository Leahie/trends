import { useData } from "@/context/data";
import { useEditor } from "@/context/editor";
import type { Block } from "@/types/types";
import { useEffect, useMemo } from "react";

interface SelectionBoxProps {
    selectionBox: {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null;
    scale: number;
    pan: {x:number; y:number};
}

export default function SelectionBox({selectionBox, scale, pan} :SelectionBoxProps){
    const {blocks} = useData();
    const {setSelection, selectedBlockIds} = useEditor();

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

    const selectedBlocksBounds = useMemo(() => {
        if (selectedBlockIds.length === 0) return null;
        const selectedBlocks = blocks.filter(b => selectedBlockIds.includes(b.id));
        if (selectedBlocks.length === 0) return null;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        selectedBlocks.forEach(block => {
            minX = Math.min(minX, block.location.x);
            maxX = Math.max(maxX, block.location.x + block.location.width);
            minY = Math.min(minY, block.location.y);
            maxY = Math.max(maxY, block.location.y + block.location.height);
        });
        
        return {
            left: minX,
            top: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }, [selectedBlockIds, blocks])

    if (!selectionBox && !selectedBlocksBounds) return null;


    return(
        <>
            {/* Drawing Mode */}
            {
                selectionBox && displayBounds && (
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

                )
            }

            {/* Display */}
            {
                selectedBlocksBounds && selectedBlockIds.length > 1 && (
                    <div style={{
                        position: 'absolute',
                        left: `${selectedBlocksBounds.left}px`,
                        top: `${selectedBlocksBounds.top}px`,
                        width: `${selectedBlocksBounds.width}px`,
                        height: `${selectedBlocksBounds.height}px`,
                        border: '3px solid rgba(59, 130, 246, 1)',
                        pointerEvents: 'none',
                        zIndex: 998,
                        boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.5)',
                    }}/>
                )
            }
        </>
    )

}