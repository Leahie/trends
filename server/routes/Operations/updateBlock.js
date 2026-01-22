import { admin, db } from "../../firebase.js";

/**
 * Update a single block, handling board_block title sync with linked board
 */
export async function updateSingleBlock(blockId, updates, userId) {
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
    throw new Error("Block is deleted");
  }

  const {boardId, ...safeUpdates} = updates;

  if (safeUpdates.location && block.location) {
    safeUpdates.location = {
      ...block.location,
      ...safeUpdates.location
    };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  await blockRef.update({...safeUpdates, updatedAt: now});

  // If this is a board_block and title is changing, update the linked board's title
  if (block.type === 'board_block' && 
      safeUpdates.content?.title && 
      block.linkedBoardId) {
    await db.collection("boards").doc(block.linkedBoardId).update({
      title: safeUpdates.content.title,
      updatedAt: now
    });
  }
  
  // Update parent board timestamp
  if (block.boardId) {
    await db.collection("boards").doc(block.boardId).update({
      updatedAt: now
    });
  }

  const updatedBlockDoc = await blockRef.get();
  return { id: updatedBlockDoc.id, ...updatedBlockDoc.data() };
}

/**
 * Batch update multiple blocks, handling board_block title sync
 */
export async function batchUpdateBlocks(updatesArray, userId) {
  if (!updatesArray || Object.keys(updatesArray).length === 0) {
    throw new Error("No updates provided");
  }

  const blockIds = Object.keys(updatesArray);
  const blockDocs = await Promise.all(
    blockIds.map((id) => db.collection("blocks").doc(id).get())
  );

  const blockDataMap = {};
  const boardIds = new Set();

  for (const doc of blockDocs) {
    if (!doc.exists) {
      throw new Error(`Block with ID ${doc.id} not found`);
    }
    const block = doc.data();
    blockDataMap[doc.id] = block;

    if (block.userId !== userId) {
      throw new Error("Forbidden");
    }

    if (block.deletedAt !== null) {
      throw new Error(`Block with ID ${doc.id} is deleted`);
    }

    boardIds.add(block.boardId);
  }

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const boardBlockTitleUpdates = [];

  Object.entries(updatesArray).forEach(([id, updates]) => {
    const blockRef = db.collection("blocks").doc(id);
    const existingBlock = blockDataMap[id];
    
    const processedUpdates = {...updates};
    if (processedUpdates.location && existingBlock.location) {
      processedUpdates.location = {
        ...existingBlock.location,
        ...processedUpdates.location
      };
    }
    batch.update(blockRef, {...processedUpdates, updatedAt: now});

    // Track board_block title changes for linked board updates
    if (existingBlock.type === 'board_block' && 
        updates.content?.title && 
        existingBlock.linkedBoardId) {
      boardBlockTitleUpdates.push({
        boardId: existingBlock.linkedBoardId,
        newTitle: updates.content.title
      });
    }
  });

  // Update linked board titles for board_blocks
  boardBlockTitleUpdates.forEach(({boardId, newTitle}) => {
    const boardRef = db.collection("boards").doc(boardId);
    batch.update(boardRef, { 
      title: newTitle,
      updatedAt: now 
    });
  });

  // Update all affected board timestamps
  boardIds.forEach((boardId) => {
    const boardRef = db.collection("boards").doc(boardId);
    batch.update(boardRef, { updatedAt: now });
  });

  await batch.commit();

  return { 
    updatedBlockIds: Object.keys(updatesArray), 
    affectedBoards: Array.from(boardIds) 
  };
}
