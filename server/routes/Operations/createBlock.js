import { admin, db } from "../../firebase.js";
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_THEME = {
  black: "#343135",
  dark: "#2C302B",
  highlight: "#596157",
  accent: "#6C816F",
  "light-accent": "#90A694",
  white: "#F5F1ED",
  "light-hover": "#D8D8D8",
};

/**
 * Recursively copy a board and all its blocks, including nested board_blocks
 */
export async function recursiveCopyBoard(db, userId, originalBoardId, now, batch, idMappings = {}) {
  const originalBoardDoc = await db.collection("boards").doc(originalBoardId).get();
  if (!originalBoardDoc.exists) {
    return null;
  }

  const originalBoard = originalBoardDoc.data();
  
  // Verify ownership
  if (originalBoard.userId !== userId) {
    throw new Error("Forbidden: Cannot copy board from another user");
  }

  // Create new board with new ID
  const newBoardId = uuidv4();
  const newBoard = {
    ...originalBoard,
    id: newBoardId,
    parentBoardBlockId: null, // will be set later by the caller
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
  
  batch.set(db.collection("boards").doc(newBoardId), newBoard);
  idMappings[originalBoardId] = newBoardId;

  // Get all blocks in the original board
  const blocksSnapshot = await db.collection("blocks")
    .where("boardId", "==", originalBoardId)
    .where("deletedAt", "==", null)
    .get();

  const blockIdMap = {}; // Map old block ID -> new block ID
  const boardBlocksWithLinkedBoards = []; // Track board_blocks for recursive copying

  // First pass: create all blocks with new IDs
  blocksSnapshot.docs.forEach((doc) => {
    const originalBlock = doc.data();
    const newBlockId = uuidv4();
    blockIdMap[doc.id] = newBlockId;

    const newBlock = {
      ...originalBlock,
      id: newBlockId,
      boardId: newBoardId,
      linkedBoardId: null, // will be resolved in second pass
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    if (originalBlock.type === "board_block" && originalBlock.linkedBoardId) {
      boardBlocksWithLinkedBoards.push({
        originalBlockId: doc.id,
        newBlockId: newBlockId,
        originalLinkedBoardId: originalBlock.linkedBoardId,
        newBlockData: newBlock
      });
    }

    batch.set(db.collection("blocks").doc(newBlockId), newBlock);
  });

  // Second pass: recursively copy linked boards for board_blocks
  for (const boardBlockInfo of boardBlocksWithLinkedBoards) {
    const copiedLinkedBoardId = await recursiveCopyBoard(
      db,
      userId,
      boardBlockInfo.originalLinkedBoardId,
      now,
      batch,
      idMappings
    );

    if (copiedLinkedBoardId) {
      // Update the board_block to reference the new linked board
      batch.update(db.collection("blocks").doc(boardBlockInfo.newBlockId), {
        linkedBoardId: copiedLinkedBoardId
      });

      // Update the linked board's parentBoardBlockId
      batch.update(db.collection("boards").doc(copiedLinkedBoardId), {
        parentBoardBlockId: boardBlockInfo.newBlockId
      });
    }
  }

  return newBoardId;
}

/**
 * Create a single block, handling board_block type with linked board creation
 */
export async function createSingleBlock(boardId, blockData, userId) {
  // If creating a board_block without linkedBoardId, create a new board for it 
  let linkedBoardId = blockData.linkedBoardId || null;
  
  const blockId = blockData.id || uuidv4();

  let boardData = null;
  if (blockData.type === "board_block" && !linkedBoardId) {
    const newBoardId = uuidv4();
    boardData = {
      id: newBoardId, 
      userId, 
      title: "Untitled Board",
      colorscheme: DEFAULT_THEME,
      parentBoardBlockId: blockId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedAt: null
    };
    await db.collection("boards").doc(newBoardId).set(boardData);
    linkedBoardId = newBoardId;
  }

  const newBlock = {
    id: blockId,
    boardId, 
    userId, 
    type: blockData.type || "text",
    location: {
      x: blockData.location?.x ?? blockData.x ?? 0,
      y: blockData.location?.y ?? blockData.y ?? 0,
      width: blockData.location?.width ?? blockData.width ?? 100,
      height: blockData.location?.height ?? blockData.height ?? 100,
      zIndex: blockData.location?.zIndex ?? blockData.zIndex ?? 0,
      rotation: blockData.location?.rotation ?? blockData.rotation ?? 0,
      scaleX: blockData.location?.scaleX ?? blockData.scaleX ?? 1,
      scaleY: blockData.location?.scaleY ?? blockData.scaleY ?? 1,
    },
    content: blockData.content || {},
    linkedBoardId: linkedBoardId,
    deletedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // If creating a board_block with a linkedBoardId, update that board's parentBoardBlockId
  if (newBlock.type === "board_block" && newBlock.linkedBoardId) {
    await db.collection("boards").doc(newBlock.linkedBoardId).update({
      parentBoardBlockId: blockId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  await db.collection("blocks").doc(blockId).set(newBlock);
  await db.collection("boards").doc(boardId).update({
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { block: newBlock, board: boardData };
}

/**
 * Create multiple blocks in batch, handling board_block types with linked boards
 */
export async function createBatchBlocks(boardId, blocksData, userId) {
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const newBlocks = [];
  const newBoards = [];

  // Maps for handling board_block linked boards
  const linkedBoardsToDuplicate = [];
  const linkedBoardMap = {}; // old linkedBoardId -> new linkedBoardId
  const newBoardForBlockMap = {}; // blockId -> newly created linkedBoardId (when none provided)
  const idMappings = {};

  // First pass: collect boards to duplicate
  for (const blockData of blocksData) {
    if (blockData.type === "board_block") {
      // If copiedFromLinkedBoardId is set, recursively copy that board
      if (blockData.copiedFromLinkedBoardId) {
        linkedBoardsToDuplicate.push({
          originalBoardId: blockData.copiedFromLinkedBoardId,
          recursive: true
        });
      }
      // Otherwise if linkedBoardId is set, duplicate it
      else if (blockData.linkedBoardId) {
        linkedBoardsToDuplicate.push({
          originalBoardId: blockData.linkedBoardId,
          recursive: false
        });
      }
    }
  }

  // Duplicate/copy linked boards for board_blocks
  for (const boardInfo of linkedBoardsToDuplicate) {
    const oldLinkedBoardId = boardInfo.originalBoardId;
    
    if (boardInfo.recursive) {
      // Recursively copy the entire board structure
      const newLinkedBoardId = await recursiveCopyBoard(
        db,
        userId,
        oldLinkedBoardId,
        now,
        batch,
        idMappings
      );
      if (newLinkedBoardId) {
        linkedBoardMap[oldLinkedBoardId] = newLinkedBoardId;
      }
    } else {
      // Simple duplicate of just the board (old behavior)
      const linkedBoardDoc = await db.collection("boards").doc(oldLinkedBoardId).get();
      if (linkedBoardDoc.exists) {
        const linkedBoard = linkedBoardDoc.data();
        const newLinkedBoardId = uuidv4();
        const newLinkedBoard = {
          ...linkedBoard,
          id: newLinkedBoardId,
          parentBoardBlockId: null, // set later when block is created
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        };
        batch.set(db.collection("boards").doc(newLinkedBoardId), newLinkedBoard);
        newBoards.push(newLinkedBoard);
        linkedBoardMap[oldLinkedBoardId] = newLinkedBoardId;
      }
    }
  }

  // Second pass: create brand-new linked boards for board_blocks that don't specify one
  for (const blockData of blocksData) {
    if (blockData.type === "board_block" && !blockData.linkedBoardId && !blockData.copiedFromLinkedBoardId) {
      const blockId = blockData.id || uuidv4();
      const newLinkedBoardId = uuidv4();
      newBoardForBlockMap[blockId] = newLinkedBoardId;

      const newBoard = {
        id: newLinkedBoardId,
        userId,
        title: "Untitled Board",
        colorscheme: DEFAULT_THEME,
        parentBoardBlockId: blockId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      batch.set(db.collection("boards").doc(newLinkedBoardId), newBoard);
      newBoards.push(newBoard);
    }
  }

  // Final pass: create blocks and wire up linked boards appropriately
  for (const blockData of blocksData) {
    const blockId = blockData.id || uuidv4();

    const newBlock = {
      id: blockId,
      boardId,
      userId,
      type: blockData.type || "text",
      location: {
        x: blockData.location?.x ?? blockData.x ?? 0,
        y: blockData.location?.y ?? blockData.y ?? 0,
        width: blockData.location?.width ?? blockData.width ?? 100,
        height: blockData.location?.height ?? blockData.height ?? 100,
        zIndex: blockData.location?.zIndex ?? blockData.zIndex ?? 0,
        rotation: blockData.location?.rotation ?? blockData.rotation ?? 0,
        scaleX: blockData.location?.scaleX ?? blockData.scaleX ?? 1,
        scaleY: blockData.location?.scaleY ?? blockData.scaleY ?? 1,
      },
      content: blockData.content || {},
      linkedBoardId: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    // Resolve linkedBoardId for board_blocks
    if (newBlock.type === "board_block") {
      if (blockData.copiedFromLinkedBoardId && linkedBoardMap[blockData.copiedFromLinkedBoardId]) {
        // Use recursively copied board
        newBlock.linkedBoardId = linkedBoardMap[blockData.copiedFromLinkedBoardId];
      } else if (blockData.linkedBoardId && linkedBoardMap[blockData.linkedBoardId]) {
        // Use duplicated board
        newBlock.linkedBoardId = linkedBoardMap[blockData.linkedBoardId];
      } else if (newBoardForBlockMap[blockId]) {
        // Use newly created board for this block
        newBlock.linkedBoardId = newBoardForBlockMap[blockId];
      } else if (blockData.linkedBoardId) {
        // Fall back to provided linkedBoardId
        newBlock.linkedBoardId = blockData.linkedBoardId;
      }

      // Set parentBoardBlockId on the linked board if we have one
      if (newBlock.linkedBoardId) {
        batch.update(db.collection("boards").doc(newBlock.linkedBoardId), {
          parentBoardBlockId: blockId,
          updatedAt: now
        });

        // Keep the in-memory newBoards list in sync so the frontend receives the linkage
        const idx = newBoards.findIndex(b => b.id === newBlock.linkedBoardId);
        if (idx !== -1) {
          newBoards[idx] = {
            ...newBoards[idx],
            parentBoardBlockId: blockId,
          };
        }
      }
    }

    batch.set(db.collection("blocks").doc(blockId), newBlock);
    newBlocks.push(newBlock);
  }

  // Update parent board timestamp
  batch.update(db.collection("boards").doc(boardId), {
    updatedAt: now
  });

  await batch.commit();

  return { blocks: newBlocks, boards: newBoards };
}
