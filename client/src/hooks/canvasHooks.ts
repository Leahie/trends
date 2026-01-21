import type { Block } from "@/types/types";

export interface GroupMoveState {
    isActive: boolean;
    offsetX: number;
    offsetY: number;
}

interface checkBoardBlockIntersection{
    selectedBlockIds: string[],
    groupMoveState: GroupMoveState, 
    setDropTargetBoardBlockId: (value: string | null) => void;
    blocks: Block[],

}
export const checkBoardBlockIntersection = ({selectedBlockIds, groupMoveState, setDropTargetBoardBlockId, blocks}: checkBoardBlockIntersection) => {
    if (selectedBlockIds.length === 0 || !groupMoveState.isActive) {
        setDropTargetBoardBlockId(null);
        return;
    }

    // Get selected blocks with their current positions (including move offset)
    const selectedBlocks = blocks.filter((b:Block) => selectedBlockIds.includes(b.id));
    if (selectedBlocks.length === 0) return;

    // Calculate selection bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    selectedBlocks.forEach(block => {
        const x = block.location.x + groupMoveState.offsetX;
        const y = block.location.y + groupMoveState.offsetY;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x + block.location.width);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y + block.location.height);
    });

    const selectionBounds = { minX, maxX, minY, maxY };

    // Find board blocks (exclude selected ones)
    const boardBlocks = blocks.filter(
        b => b.type === "board_block" && 
        !selectedBlockIds.includes(b.id) &&
        b.linkedBoardId
    );

    // Check for intersection with highest priority (largest overlap area)
    type MatchType = { id: string; overlapArea: number };
    
    const bestMatch = boardBlocks.reduce<MatchType | null>((best, bb) => {
        const bbBounds = {
            minX: bb.location.x,
            maxX: bb.location.x + bb.location.width,
            minY: bb.location.y,
            maxY: bb.location.y + bb.location.height
        };

        // Calculate intersection
        const intersectMinX = Math.max(selectionBounds.minX, bbBounds.minX);
        const intersectMaxX = Math.min(selectionBounds.maxX, bbBounds.maxX);
        const intersectMinY = Math.max(selectionBounds.minY, bbBounds.minY);
        const intersectMaxY = Math.min(selectionBounds.maxY, bbBounds.maxY);

        if (intersectMinX < intersectMaxX && intersectMinY < intersectMaxY) {
            // Calculate overlap area
            const overlapArea = (intersectMaxX - intersectMinX) * (intersectMaxY - intersectMinY);
            
            if (!best || overlapArea > best.overlapArea) {
                return { id: bb.id, overlapArea };
            }
        }
        return best;
    }, null);

    const targetId = bestMatch ? bestMatch.id : null;
    setDropTargetBoardBlockId(targetId);
};
