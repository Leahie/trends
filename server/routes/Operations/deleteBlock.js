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
 * Soft delete a single block, cascading to linked board if it's a board_block
 */
export async function deleteSingleBlock(blockId, userId) {
  const blockRef = db.collection("blocks").doc(blockId);
  const blockDoc = await blockRef.get();
  
  if (!blockDoc.exists) {
    throw new Error("Block not found");
  }
  
  const block = blockDoc.data();
  if (block.userId !== userId) {
    throw new Error("Forbidden");
  }

  if (block.deletedAt !== null) {
    throw new Error("Block is already deleted");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const result = { boards: [], blocks: [] };
  result.blocks.push(blockId);

  // If this is a board_block, cascade delete the linked board
  if (block.type === "board_block" && block.linkedBoardId) {
    const deletionId = uuidv4();
    await blockRef.update({ deletedAt: now, deletionId });
    await deleteBoardRecursively(block.linkedBoardId, userId, deletionId, result);
  } else {
    await blockRef.update({ deletedAt: now });
  }

  // Update parent board timestamp
  if (block.boardId) {
    await db.collection("boards").doc(block.boardId).update({
      updatedAt: now
    });
  }
  
  return {
    id: blockId,
    boards: result.boards,
    blocks: result.blocks
  };
}

/**
 * Batch soft delete multiple blocks, cascading to linked boards for board_blocks
 */
export async function batchDeleteBlocks(blockIds, userId) {
  if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
    throw new Error("No block IDs provided");
  }

  const blockDocs = await Promise.all(
    blockIds.map((id) => db.collection("blocks").doc(id).get())
  );
  
  const boardIds = new Set();
  const linkedBoardsToDelete = [];
  const result = { boards: [], blocks: [] };

  for (const doc of blockDocs) {
    if (!doc.exists) continue;
    const block = doc.data();
    if (block.userId !== userId) {
      throw new Error("Forbidden");
    }
    boardIds.add(block.boardId);
    result.blocks.push(doc.id);

    // Track board_blocks for cascade deletion
    if (block.type === "board_block" && block.linkedBoardId) {
      linkedBoardsToDelete.push(block.linkedBoardId);
    }
  }

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const deletionId = uuidv4();
  
  blockIds.forEach((id) => {
    const blockRef = db.collection("blocks").doc(id);
    batch.update(blockRef, { deletedAt: now, deletionId });
  });

  boardIds.forEach((boardId) => {
    const boardRef = db.collection("boards").doc(boardId);
    batch.update(boardRef, { updatedAt: now });
  });
  
  await batch.commit();

  // Cascade delete linked boards
  for (const linkedBoardId of linkedBoardsToDelete) {
    await deleteBoardRecursively(linkedBoardId, userId, deletionId, result);
  }

  return { 
    deletedBlockIds: blockIds, 
    affectedBoards: Array.from(boardIds),
    cascadeDeletedBoards: linkedBoardsToDelete.length,
    boards: result.boards,
    blocks: result.blocks
  };
}

/**
 * Permanently delete a single block, cascading to linked board if it's a board_block
 */
export async function permanentlyDeleteBlock(blockId, userId) {
  const blockRef = db.collection("blocks").doc(blockId);
  const blockDoc = await blockRef.get();
  
  if (!blockDoc.exists) {
    throw new Error("Block not found");
  }
  
  const block = blockDoc.data();
  if (block.userId !== userId) {
    throw new Error("Forbidden");
  }

  const result = { boards: [], blocks: [] };
  result.blocks.push(blockId);

  // If this is a board_block, cascade delete the linked board
  if (block.type === "board_block" && block.linkedBoardId) {
    await permanentlyDeleteBoardRecursively(block.linkedBoardId, userId, result);
  }

  // Delete the block
  await blockRef.delete();

  // Update parent board timestamp if it exists
  if (block.boardId) {
    const parentBoardDoc = await db.collection("boards").doc(block.boardId).get();
    if (parentBoardDoc.exists) {
      await db.collection("boards").doc(block.boardId).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  
  return {
    id: blockId,
    boards: result.boards,
    blocks: result.blocks
  };
}
