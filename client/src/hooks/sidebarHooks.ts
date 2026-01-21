import { useCallback } from 'react';
import { api } from '@/utils/api';
import type { Block, Board } from '@/types/types';

interface UseNavOperationsProps {
  archiveBoard: (boardId: string) => Promise<boolean>;
  updateBoard: (boardId: string, updates: any) => Promise<boolean>;
  createBoard: (title?: string, parentId?: string) => Promise<any>;
  addBlock: (block: any) => Promise<any>;
  blocks: Block[];
  isPinned: (boardId: string) => boolean;
  pinBoard: (boardId: string) => Promise<boolean>;
  unpinBoard: (boardId: string) => Promise<boolean>;
  boardsMap: Record<string, Board>;
  boards: Board[];
}

export function useNavOperations({
  archiveBoard,
  updateBoard,
  createBoard,
  addBlock,
  blocks,
  isPinned,
  pinBoard,
  unpinBoard,
  boardsMap,
  boards
}: UseNavOperationsProps) {

  // Helper to get all descendants of a board
  const getAllDescendants = useCallback((boardId: string, collected: Set<string> = new Set()): Set<string> => {
    collected.add(boardId);
    
    // Find all board_blocks in this board
    const boardBlocks = blocks.filter(b => 
      b.boardId === boardId && 
      b.type === 'board_block' && 
      b.linkedBoardId
    );
    
    // Recursively collect descendants
    boardBlocks.forEach(block => {
      if (block.linkedBoardId && !collected.has(block.linkedBoardId)) {
        getAllDescendants(block.linkedBoardId, collected);
      }
    });
    
    return collected;
  }, [blocks]);

  // Delete operation
  const handleDelete = useCallback(async (boardId: string) => {
    const descendants = getAllDescendants(boardId);
    const count = descendants.size;
    
    const message = count > 1 
      ? `Are you sure you want to delete this board and its ${count - 1} child board(s)?`
      : 'Are you sure you want to delete this board?';
    
    const confirmed = window.confirm(message);
    if (!confirmed) return false;

    return await archiveBoard(boardId);
  }, [archiveBoard, getAllDescendants]);

  // Pin/Unpin operation
  const handleTogglePin = useCallback(async (boardId: string) => {
    if (isPinned(boardId)) {
      return await unpinBoard(boardId);
    } else {
      return await pinBoard(boardId);
    }
  }, [isPinned, pinBoard, unpinBoard]);

  // Rename operation
  const handleRename = useCallback(async (boardId: string, currentTitle: string) => {
    const newTitle = window.prompt('Enter new board name:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return false;

    return await updateBoard(boardId, { title: newTitle });
  }, [updateBoard]);

  // Add child board operation
  const handleAddChild = useCallback(async (parentBoardId: string) => {
    const title = window.prompt('Enter name for new child board:');
    if (!title) return null;

    const parentBlocks = blocks.filter(b => b.boardId === parentBoardId);
    
    const newBoard = await createBoard(title, undefined);
    if (!newBoard) return null;

    const maxZ = Math.max(...parentBlocks.map(b => b.location.zIndex), 0);
    
    const boardBlock = await addBlock({
      type: 'board_block',
      boardId: parentBoardId,
      linkedBoardId: newBoard.id,
      content: {
        title: title
      },
      location: {
        x: 100,
        y: 100,
        width: 300,
        height: 200,
        zIndex: maxZ + 1,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      }
    });

    if (!boardBlock) return null;

    await updateBoard(newBoard.id, {
      parentBoardBlockId: boardBlock.id
    });

    return newBoard;
  }, [createBoard, addBlock, updateBoard, blocks]);

  // Helper function to check for circular hierarchy
  const isDescendant = useCallback((boardId: string, potentialAncestorId: string): boolean => {
    if (boardId === potentialAncestorId) {
      return true;
    }

    const potentialAncestor = boardsMap[potentialAncestorId];
    if (!potentialAncestor?.parentBoardBlockId) {
      return false;
    }

    const parentBlock = blocks.find(b => b.id === potentialAncestor.parentBoardBlockId);
    if (!parentBlock?.boardId) {
      return false;
    }

    return isDescendant(boardId, parentBlock.boardId);
  }, [boardsMap, blocks]);

  // Move board as a child of target board
  const handleMoveInto = useCallback(async (boardId: string, targetBoardId: string) => {
    // Check for circular dependency
    if (isDescendant(targetBoardId, boardId)) {
      alert("Cannot move a board into its own descendant!");
      return false;
    }

    // Find existing board_block for this board
    const existingBoardBlock = blocks.find(b => b.linkedBoardId === boardId && b.type === 'board_block');
    
    if (existingBoardBlock) {
      // Move the existing board_block to the target board
      const result = await api.moveBlocks([existingBoardBlock.id], targetBoardId);
      return result.success;
    }

    // No existing board_block, create a new one in the target board
    const targetBlocks = blocks.filter(b => b.boardId === targetBoardId);
    const maxZ = Math.max(...targetBlocks.map(b => b.location.zIndex), 0);

    const boardDoc = await api.fetchBoard(boardId);
    if (!boardDoc.success || !boardDoc.data) return false;

    const boardData = boardDoc.data.board;

    const boardBlock = await addBlock({
      type: 'board_block',
      boardId: targetBoardId,
      linkedBoardId: boardId,
      content: {
        title: boardData.title
      },
      location: {
        x: 100,
        y: 100,
        width: 300,
        height: 200,
        zIndex: maxZ + 1,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      }
    });

    if (!boardBlock) return false;

    return await updateBoard(boardId, {
      parentBoardBlockId: boardBlock.id
    });
  }, [blocks, boardsMap, updateBoard, addBlock, isDescendant]);

  // Move board as a sibling (between two boards or to root)
  const handleMoveBetween = useCallback(async (
    boardId: string, 
    afterBoardId: string | null,
    newParentBoardId: string | null
  ) => {
    // Check for circular dependency if moving into a board
    if (newParentBoardId && isDescendant(newParentBoardId, boardId)) {
      alert("Cannot move a board into its own descendant!");
      return false;
    }

    const movingBoard = boardsMap[boardId];
    if (!movingBoard) return false;

    const existingBoardBlock = blocks.find(b => b.linkedBoardId === boardId && b.type === 'board_block');

    console.log("this is the new parent board id", newParentBoardId, existingBoardBlock)
    // If moving to root (newParentBoardId is null)
    if (newParentBoardId === null) {
      if (!existingBoardBlock) {
        // No board_block to move, just update board reference
        return await updateBoard(boardId, {
          parentBoardBlockId: null
        });
      }
      // Move the existing board_block to root
      const result = await api.moveBlocks([existingBoardBlock.id], null);
      console.log(result)
      if (result.success){
        blocks.splice(blocks.indexOf(existingBoardBlock), 1);
        
      }
      return result.success;
    }

    // Moving to a parent board (newParentBoardId is not null)
    if (existingBoardBlock && existingBoardBlock.boardId === newParentBoardId) {
      // Already in the right parent, just need to reorder (handled by backend ordering)
      return true;
    }

    if (existingBoardBlock && existingBoardBlock.boardId !== newParentBoardId) {
      // Move existing board_block to new parent
      const result = await api.moveBlocks([existingBoardBlock.id], newParentBoardId);
      return result.success;
    }

    // Create new board_block in parent
    const parentBlocks = blocks.filter(b => b.boardId === newParentBoardId);
    const maxZ = Math.max(...parentBlocks.map(b => b.location.zIndex), 0);

    const boardData = await api.fetchBoard(boardId);
    if (!boardData.success || !boardData.data) return false;

    const board = boardData.data.board;

    const boardBlock = await addBlock({
      type: 'board_block',
      boardId: newParentBoardId,
      linkedBoardId: boardId,
      content: {
        title: board.title
      },
      location: {
        x: 100,
        y: 100,
        width: 300,
        height: 200,
        zIndex: maxZ + 1,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      }
    });

    if (!boardBlock) return false;

    return await updateBoard(boardId, {
      parentBoardBlockId: boardBlock.id
    });
  }, [blocks, boardsMap, updateBoard, addBlock, isDescendant]);

  return {
    handleDelete,
    handleTogglePin,
    handleRename,
    handleAddChild,
    handleMoveInto,
    handleMoveBetween,
    getAllDescendants,
    isDescendant
  };
}