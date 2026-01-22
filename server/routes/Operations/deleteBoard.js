import { admin, db } from "../../firebase.js";
import { v4 as uuidv4 } from 'uuid';

/**
 * Recursively soft delete a board and all its child blocks/boards
 */
export async function deleteBoardRecursively(boardId, userId, deletionId, result = { boards: [], blocks: [] }) {
  const boardRef = db.collection("boards").doc(boardId);
  const boardDoc = await boardRef.get();

  if (!boardDoc.exists) {
    return result;
  }

  const board = boardDoc.data();
  if (board.userId !== userId) {
    throw new Error("Forbidden");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Soft delete this board
  result.boards.push(boardId);
  await boardRef.update({deletedAt: now, deletionId: deletionId});

  // Get all blocks in this board
  const blocksSnapshot = await db.collection("blocks")
    .where("boardId", "==", boardId)
    .where("deletedAt", "==", null)
    .get();

  const batch = db.batch();
  const childBoardsToDelete = [];

  blocksSnapshot.docs.forEach((doc) => {
    result.blocks.push(doc.id);
    const block = doc.data();
    
    batch.update(doc.ref, {
      deletedAt: now, 
      deletionId: deletionId
    });

    if (block.type === "board_block" && block.linkedBoardId) {
      childBoardsToDelete.push(block.linkedBoardId);
    }
  });

  await batch.commit();

  // Recursively delete child boards
  for (const childBoardId of childBoardsToDelete) {
    await deleteBoardRecursively(childBoardId, userId, deletionId, result);
  }

  return result;
}

/**
 * Recursively permanently delete a board and all its child blocks/boards
 */
export async function permanentlyDeleteBoardRecursively(boardId, userId, result = { boards: [], blocks: [] }) {
  const boardRef = db.collection("boards").doc(boardId);
  const boardDoc = await boardRef.get();

  if (!boardDoc.exists) {
    return result;
  }

  const board = boardDoc.data();
  if (board.userId !== userId) {
    throw new Error("Forbidden");
  }

  // Get all blocks in this board
  const blocksSnapshot = await db.collection("blocks")
    .where("boardId", "==", boardId)
    .get();

  const batch = db.batch();
  const childBoardsToDelete = [];

  blocksSnapshot.docs.forEach((doc) => {
    result.blocks.push(doc.id);
    const block = doc.data();
    
    batch.delete(doc.ref);

    if (block.type === "board_block" && block.linkedBoardId) {
      childBoardsToDelete.push(block.linkedBoardId);
    }
  });

  // Delete the board itself
  result.boards.push(boardId);
  batch.delete(boardRef);

  await batch.commit();

  // Recursively delete child boards
  for (const childBoardId of childBoardsToDelete) {
    await permanentlyDeleteBoardRecursively(childBoardId, userId, result);
  }

  return result;
}

/**
 * Soft delete a board and cascade to all children
 */
export async function deleteBoard(boardId, userId) {
  const boardRef = db.collection("boards").doc(boardId);
  const boardDoc = await boardRef.get();

  if (!boardDoc.exists) {
    throw new Error("Board not found");
  }

  const board = boardDoc.data();
  if (board.userId !== userId) {
    throw new Error("Forbidden");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const deletionId = uuidv4();

  // Initialize result tracking
  const result = { boards: [], blocks: [] };
  result.boards.push(boardId);

  // Soft delete this board
  await boardRef.update({deletedAt: now, deletionId: deletionId});

  // If this board has a parent board_block, delete that too
  if (board.parentBoardBlockId) {
    const parentBlockRef = db.collection("blocks").doc(board.parentBoardBlockId);
    const parentBlockDoc = await parentBlockRef.get();
    
    if (parentBlockDoc.exists) {
      await parentBlockRef.update({
        deletedAt: now,
        deletionId: deletionId
      });
      result.blocks.push(board.parentBoardBlockId);
    }
  }

  // Get all blocks in this board
  const blocksSnapshot = await db.collection("blocks")
    .where("boardId", "==", boardId)
    .where("deletedAt", "==", null)
    .get();

  const batch = db.batch();
  const childBoardsToDelete = [];

  // Mark all blocks as deleted
  blocksSnapshot.docs.forEach((doc) => {
    const block = doc.data();
    result.blocks.push(doc.id);
    
    batch.update(doc.ref, {
      deletedAt: now, 
      deletionId: deletionId
    });

    // If this is a board_block, we need to cascade delete its linked board
    if (block.type === "board_block" && block.linkedBoardId) {
      childBoardsToDelete.push(block.linkedBoardId);
    }
  });

  await batch.commit();

  // Recursively delete child boards
  for (const childBoardId of childBoardsToDelete) {
    await deleteBoardRecursively(childBoardId, userId, deletionId, result);
  }

  // Remove from user's pinned boards
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  
  if (userDoc.exists) {
    const userData = userDoc.data();
    const pinnedBoards = userData.pinnedBoards || [];
    
    if (pinnedBoards.includes(boardId)) {
      await userRef.update({
        pinnedBoards: admin.firestore.FieldValue.arrayRemove(boardId)
      });
    }
  }

  return {
    boardId, 
    deletionId,
    deletedBoardCount: result.boards.length,
    deletedBlockCount: result.blocks.length,
    boards: result.boards,
    blocks: result.blocks
  };
}

/**
 * Restore a soft-deleted board
 */
export async function restoreBoard(boardId, userId) {
  const boardRef = db.collection("boards").doc(boardId);
  const boardDoc = await boardRef.get();

  if (!boardDoc.exists) {
    throw new Error("Board not found");
  }

  const board = boardDoc.data();
  if (board.userId !== userId) {
    throw new Error("Forbidden");
  }

  const deletionId = board.deletionId;

  await boardRef.update({
    deletedAt: null, 
    deletionId: null, 
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  if (deletionId) {
    const blocksSnapshot = await db.collection("blocks")
      .where("boardId", "==", boardId)
      .where("deletionId", "==", deletionId)
      .get();
    
    const batch = db.batch();
    blocksSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        deletedAt: null, 
        deletionId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    
    return { boardId, restoredBlocksCount: blocksSnapshot.docs.length };
  } else {
    return { boardId, restoredBlocksCount: 0 };
  }
}

/**
 * Permanently delete a board and all blocks
 */
export async function permanentlyDeleteBoard(boardId, userId) {
  const boardRef = db.collection("boards").doc(boardId);
  const boardDoc = await boardRef.get();
  
  if (!boardDoc.exists) {
    throw new Error("Board not found");
  }
  
  const board = boardDoc.data();
  if (board.userId !== userId) {
    throw new Error("Forbidden");
  }
  
  const blocksSnapshot = await db.collection("blocks")
    .where("boardId", "==", boardId)
    .get();

  const batch = db.batch();
  blocksSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  await boardRef.delete();

  return {
    boardId, 
    deletedBlockCount: blocksSnapshot.docs.length
  };
}
