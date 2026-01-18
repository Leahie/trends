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
  boardsMap
}: UseNavOperationsProps) {

  // Delete operation
  const handleDelete = useCallback(async (boardId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this board?');
    if (!confirmed) return false;

    return await archiveBoard(boardId);
  }, [archiveBoard]);

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
  const isDescendant = (boardId: string, potentialAncestorId: string, boardsMap: Record<string, Board>, blocks: Block[]): boolean => {
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

    return isDescendant(boardId, parentBlock.boardId, boardsMap, blocks);
  };


  // Move to operation (changes parent-child relationship)
const handleMoveTo = useCallback(async (boardId: string, targetBoardId: string | null) => {
  if (targetBoardId === null) {
    return await updateBoard(boardId, {
      parentBoardBlockId: null
    });
  }

  if (isDescendant(boardId, targetBoardId, boardsMap, blocks)) {
    alert("Cannot move a board into its own child or descendant!");
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

  // Update board's parent reference
  return await updateBoard(boardId, {
    parentBoardBlockId: boardBlock.id
  });
}, [blocks, boardsMap, updateBoard, addBlock]);
  
return {
    handleDelete,
    handleTogglePin,
    handleRename,
    handleAddChild,
    handleMoveTo,
  };
}