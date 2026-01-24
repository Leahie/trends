/// Backend routes with hierarchical board-block support
import express from "express";
import { admin, db } from "../firebase.js";
import { authenticateUser } from "../middleware/auth.js";
import { v4 as uuidv4 } from 'uuid';

// Import block operations
import { createSingleBlock, createBatchBlocks, recursiveCopyBoard } from "./Operations/createBlock.js";
import { updateSingleBlock, batchUpdateBlocks } from "./Operations/updateBlock.js";
import { 
  deleteSingleBlock, 
  batchDeleteBlocks, 
  permanentlyDeleteBlock
} from "./Operations/deleteBlock.js";
import { wouldCreateCycle } from "./Operations/helpers.js";

// Import board operations
import { createBoard } from "./Operations/createBoard.js";
import { updateBoard } from "./Operations/updateBoard.js";
import { 
  deleteBoard,
  restoreBoard,
  permanentlyDeleteBoard,
  deleteBoardRecursively,
  permanentlyDeleteBoardRecursively 
} from "./Operations/deleteBoard.js";

const router = express.Router();


//Helper functions
async function verifyBoardIsDescendant(rootBoardId, targetBoardId){
  if(rootBoardId === targetBoardId) return true;

  const blockSnap = await db.collection('blocks')
    .where('boardId', '==', rootBoardId)
    .where('type', '==', 'board_block')
    .where('deletedAt', '==', null)
    .get();

    for(const doc of blockSnap.docs){
      const block = doc.data();

      if (block.linkedBoardId == targetBoardId){
        return true;
      }
      if (block.linkedBoardId) {
        const found = await verifyBoardIsDescendant(block.linkedBoardId, targetBoardId);
        if (found) return true;
      }
    }
    return false;
}
// get board by share token
router.get("/boards/shared/:token", async(req, res)=> {
  try{
    const { token } = req.params;

    const boardSnapshot = await db.collection("boards")
      .where("shareToken", "==" , token)
      .where("deletedAt", "==", null)
      .limit(1)
      .get();

    if(boardSnapshot.empty){
      return res.status(404).send({ error: "Board not found or link is invalid." });
    }
    const boardDoc = boardSnapshot.docs[0];
    const board = boardDoc.data();

    res.send({ board: { id: boardDoc.id, ...board } });
  } catch(error){
    ;
    res.status(500).send("Internal Server Error");
  }
});
router.get("/boards/shared/:token/blocks",  async (req, res) => {
  try{
    const { token } = req.params;

    const boardSnapshot = await db.collection("boards")
      .where("shareToken", "==" , token)
      .where("deletedAt", "==", null)
      .limit(1)
      .get();

    if (boardSnapshot.empty) {
        return res.status(404).send({ error: "Board not found." });
    }
    const boardId = boardSnapshot.docs[0].id;

    const snapshot = await db.collection("blocks")
    .where("boardId", "==", boardId)
    .where("deletedAt", "==", null)
    .orderBy("location.zIndex", "asc")
    .get();

    const blocks = snapshot.docs.map((doc) => ({
      id: doc.id, 
      ...doc.data()
    }));
    res.send({blocks});
  }catch (error){
    ;
    res.status(500).send("Internal Server Error");
  }
});
// Get blocks for a SPECIFIC board (nested navigation) 
router.get("/boards/shared/:token/blocks/:boardId", async(req, res) => {
  try {
    const { token, boardId } = req.params;

    // Verify the share token is valid
    const sharedSnap = await db.collection("boards")
      .where("shareToken", "==", token)
      .where("deletedAt", "==", null)
      .limit(1)
      .get();

    if (sharedSnap.empty) {
      return res.status(404).send({ error: "Invalid share link" });
    }

    const rootBoardId = sharedSnap.docs[0].id;

    // Verify boardId is the root or a descendant of it
    if (boardId !== rootBoardId) {
      const isDescendant = await verifyBoardIsDescendant(rootBoardId, boardId);
      if (!isDescendant) {
        return res.status(403).send({ error: "Access denied" });
      }
    }

    // Fetch blocks for the requested board
    const snapshot = await db.collection("blocks")
      .where("boardId", "==", boardId)
      .where("deletedAt", "==", null)
      .orderBy("location.zIndex", "asc")
      .get();

    const blocks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.send({ blocks });
  } catch (error) {
    console.error("Error fetching shared board blocks:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Get nested board data (for navigation into board_blocks)
router.get("/boards/shared/:token/nested/:boardId", async (req, res) => {
  try {
    const { token, boardId } = req.params;

    // Verify share token
    const sharedSnap = await db.collection("boards")
      .where("shareToken", "==", token)
      .where("deletedAt", "==", null)
      .limit(1)
      .get();

    if (sharedSnap.empty) {
      return res.status(404).send({ error: "Invalid share link" });
    }

    const rootBoardId = sharedSnap.docs[0].id;

    // Verify it's a descendant of the shared board
    const isDescendant = await verifyBoardIsDescendant(rootBoardId, boardId);
    if (!isDescendant) {
      return res.status(403).send({ error: "Access denied" });
    }

    // Fetch the nested board
    const boardSnap = await db.collection("boards").doc(boardId).get();
    if (!boardSnap.exists) {
      return res.status(404).send({ error: "Board not found" });
    }

    const board = boardSnap.data();
    
    // Make sure it's not deleted
    if (board.deletedAt !== null) {
      return res.status(404).send({ error: "Board not found" });
    }

    res.send({ board: { id: boardSnap.id, ...board } });
  } catch (error) {
    console.error("Error fetching shared nested board:", error);
    res.status(500).send("Internal Server Error");
  }
});
router.use(authenticateUser);

const DEFAULT_THEME = {
  black: "#343135",
  dark: "#2C302B",
  highlight: "#596157",
  accent: "#6C816F",
  "light-accent": "#90A694",
  white: "#F5F1ED",
  "light-hover": "#D8D8D8",
};

// ============================================================================
// BOARD ROUTES
// ============================================================================

// Get archived boards
router.get("/boards/archived", async(req, res) => {
  try {
    const userId = req.user.uid;
    const archivedSnapshot = await db.collection("boards")
        .where("userId", "==", userId)
        .where("deletedAt", "!=", null)
        .orderBy("deletedAt", "desc")
        .get();

    const boards = archivedSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.send({boards});
  } catch (error) {
    ;
    res.status(500).send("Internal Server Error");
  }
});

// Get all boards for user
router.get("/boards", async(req, res) => {
  try {
    const userId = req.user.uid;
    const blocksSnapshot = await db.collection("boards")
      .where("userId", "==", userId)
      .where("deletedAt", "==", null)
      .orderBy("updatedAt", "desc")
      .get();

    const boards = blocksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.send({boards});
  } catch (error) {
    ;
    res.status(500).send("Internal Server Error");
  }
});

// Get single board
router.get("/boards/:boardId", async(req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.uid;

    const boardDoc = await db.collection("boards").doc(boardId).get();
    if (!boardDoc.exists) {
      return res.status(404).send("Board not found");
    }

    const board = boardDoc.data();
    if (board.userId !== userId) {
      return res.status(403).send("Forbidden");
    }

    if (board.deletedAt !== null) {
      return res.status(404).send("Board not found");
    }

    res.send({board: { id: boardDoc.id, ...board }});
  } catch (error) {
    ;
    res.status(500).send("Internal Server Error");
  }
});

// Create board
router.post("/boards", async (req, res) => {
  try {
    const {title, parentBoardBlockId} = req.body;
    const userId = req.user.uid;

    const boardData = await createBoard(title, parentBoardBlockId, userId);
    res.status(201).send({board: boardData});
  } catch (error) {
    console.error("Error creating board:", error);
    if (error.message === "Parent board block not found") {
      return res.status(404).send(error.message);
    }
    if (error.message === "Parent must be a board_block") {
      return res.status(400).send(error.message);
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    res.status(500).send("Internal Server Error");
  }
});

// Update board
router.patch("/boards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const updates = req.body;

    const board = await updateBoard(id, updates, userId);
    res.send({board});
  } catch (error) {
    console.error("Error updating board:", error);
    if (error.message === "No updates provided") {
      return res.status(400).send(error.message);
    }
    if (error.message === "Board not found") {
      return res.status(404).send({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    if (error.message === "Board is deleted") {
      return res.status(404).send("Board is deleted");
    }
    return res.status(500).send("Internal Server Error");
  }
});

// Delete board (cascade delete all children)
router.delete("/boards/:id", async(req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const result = await deleteBoard(id, userId);
    res.send({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error deleting board:", error);
    if (error.message === "Board not found") {
      return res.status(404).send({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    res.status(500).send("Internal Server Error");
  }
});

// Restore board
router.post("/boards/:boardId/restore", async(req, res) => {
  try {
    const {boardId} = req.params;
    const userId = req.user.uid;

    const result = await restoreBoard(boardId, userId);
    res.send({success: true, ...result});
  } catch (error) {
    console.error("Error restoring board:", error);
    if (error.message === "Board not found") {
      return res.status(404).send({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    res.status(500).send("Internal Server Error");
  }
});

// Permanently delete board
router.delete("/boards/:boardId/permanent", async(req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.uid;
    
    const result = await permanentlyDeleteBoard(boardId, userId);
    res.send({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error permanently deleting board:", error);
    if (error.message === "Board not found") {
      return res.status(404).send({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    res.status(500).send("Internal Server Error");
  }
});

// SPREAD: Flatten a board_block - move all its child blocks to parent board and delete the board_block and its board
router.post("/boards/:boardId/blocks/:blockId/spread", async(req, res) => {
  try {
    const { boardId, blockId } = req.params;
    const userId = req.user.uid;

    // Verify the block is a board_block
    const blockDoc = await db.collection("blocks").doc(blockId).get();
    if (!blockDoc.exists) {
      return res.status(404).send("Block not found");
    }

    const block = blockDoc.data();
    if (block.userId !== userId) {
      return res.status(403).send("Forbidden");
    }
    if (block.type !== "board_block") {
      return res.status(400).send("Can only spread board_blocks");
    }
    if (block.boardId !== boardId) {
      return res.status(400).send("Block does not belong to specified board");
    }
    if (!block.linkedBoardId) {
      return res.status(400).send("Board block has no linked board");
    }

    const linkedBoardId = block.linkedBoardId;

    // Get all blocks from the linked board
    const childBlocksSnapshot = await db.collection("blocks")
      .where("boardId", "==", linkedBoardId)
      .where("deletedAt", "==", null)
      .get();

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Move all child blocks to parent board
    // Offset them to the position of the board_block
    const offsetX = block.location.x;
    const offsetY = block.location.y;

    childBlocksSnapshot.docs.forEach((doc) => {
      const childBlock = doc.data();
      batch.update(doc.ref, {
        boardId: boardId,
        location: {
          ...childBlock.location,
          x: childBlock.location.x + offsetX,
          y: childBlock.location.y + offsetY
        },
        updatedAt: now
      });
    });

    // Delete the board_block
    batch.update(db.collection("blocks").doc(blockId), {
      deletedAt: now
    });

    // Delete the linked board
    batch.update(db.collection("boards").doc(linkedBoardId), {
      deletedAt: now
    });

    // Update parent board timestamp
    batch.update(db.collection("boards").doc(boardId), {
      updatedAt: now
    });

    await batch.commit();

    res.send({
      success: true,
      movedBlockCount: childBlocksSnapshot.docs.length,
      deletedBoardBlockId: blockId,
      deletedBoardId: linkedBoardId
    });
  } catch (error) {
    ;
    res.status(500).send("Internal Server Error");
  }
});

// PUSH: Move block(s) into a board_block's linked board
router.post("/boards/:boardId/blocks/push", async(req, res) => {
  try {
    const { boardId } = req.params;
    const { blockIds, targetBoardBlockId } = req.body;
    const userId = req.user.uid;

    if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
      return res.status(400).send("No block IDs provided");
    }

    // Verify target board_block
    const targetBlockDoc = await db.collection("blocks").doc(targetBoardBlockId).get();
    if (!targetBlockDoc.exists) {
      return res.status(404).send("Target board block not found");
    }

    const targetBlock = targetBlockDoc.data();
    if (targetBlock.userId !== userId) {
      return res.status(403).send("Forbidden");
    }
    if (targetBlock.type !== "board_block") {
      return res.status(400).send("Target must be a board_block");
    }
    if (!targetBlock.linkedBoardId) {
      return res.status(400).send("Target board_block has no linked board");
    }

    const targetBoardId = targetBlock.linkedBoardId;

    // Verify all blocks belong to user and current board
    const blockDocs = await Promise.all(
      blockIds.map(id => db.collection("blocks").doc(id).get())
    );

    for (const doc of blockDocs) {
      if (!doc.exists) {
        return res.status(404).send(`Block ${doc.id} not found`);
      }
      const block = doc.data();
      if (block.userId !== userId) {
        return res.status(403).send("Forbidden");
      }
      if (block.boardId !== boardId) {
        return res.status(400).send(`Block ${doc.id} not in specified board`);
      }

      if (targetBoardId && block.type === "board_block" && block.linkedBoardId) {
        const isCycle = await wouldCreateCycle(userId, block.linkedBoardId, targetBoardId);
        if (isCycle) {
          return res.status(400).send("Cannot move a board inside one of its children");
        }
      }
    }

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Calculate offset based on board_block position
    const offsetX = -targetBlock.location.x;
    const offsetY = -targetBlock.location.y;

    // Move blocks to target board
    blockDocs.forEach((doc) => {
      const block = doc.data();
      batch.update(doc.ref, {
        boardId: targetBoardId,
        location: {
          ...block.location,
          x: block.location.x + offsetX,
          y: block.location.y + offsetY
        },
        updatedAt: now
      });
    });

    // Update timestamps
    batch.update(db.collection("boards").doc(boardId), { updatedAt: now });
    batch.update(db.collection("boards").doc(targetBoardId), { updatedAt: now });

    await batch.commit();

    res.send({
      success: true,
      movedBlockIds: blockIds,
      targetBoardId
    });
  } catch (error) {
    ;
    res.status(500).send("Internal Server Error");
  }
});

router.post("/boards/:boardId/share", async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.uid;

    const boardRef = db.collection("boards").doc(boardId);   // ✅ declare once
    const boardDoc = await boardRef.get();

    if (!boardDoc.exists) {
      return res.status(404).send({ error: "Board not found" });
    }

    const board = boardDoc.data();

    if (board.userId !== userId) {
      return res.status(403).send("Forbidden");
    }

    let shareToken = board.shareToken;

    if (!shareToken) {
      shareToken = uuidv4();
      await boardRef.update({
        shareToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.send({ shareToken });
  } catch (error) {
    console.error("Error generating share link:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Revoke share link (delete token)
router.delete("/boards/:id/share", async(req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        const boardRef = db.collection("boards").doc(id);
        const boardDoc = await boardRef.get();

        if (!boardDoc.exists) {
            return res.status(404).send({ error: "Board not found." });
        }

        const board = boardDoc.data();

        if (board.userId !== userId) {
            return res.status(403).send("Forbidden");
        }

        await boardRef.update({
            shareToken: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.send({ success: true });
    } catch (error) {
        ;
        res.status(500).send("Internal Server Error");
    }
});

// ============================================================================
// BLOCK ROUTES
// ============================================================================

// Get all blocks for a user 
router.get("/blocks", async (req, res) => {
  try {
    const userId = req.user.uid;

    const snapshot = await db.collection("blocks")
    .where("userId", "==", userId)
    .where("deletedAt", "==", null)
    .orderBy("boardId", "asc")
    .orderBy("location.zIndex", "asc")
    .get();

    const blocks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.send({ blocks });
  } catch (error) {
    console.error("Error fetching global blocks:", error);
    res.status(500).send("Internal Server Error");
  }
})


// Get blocks for a board
router.get("/boards/:boardId/blocks", async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.uid;
    
    if (!boardId) {
      return res.status(400).send("Board ID is required.");
    }

    const boardDoc = await db.collection("boards").doc(boardId).get();
    if (!boardDoc.exists) {
      return res.status(404).send("Board not found");
    }

    const board = boardDoc.data();
    if (board.userId !== userId) {
      return res.status(403).send("Forbidden");
    }

    const snapshot = await db.collection("blocks")
      .where("boardId", "==", boardId)
      .where("deletedAt", "==", null)
      .orderBy("location.zIndex", "asc")
      .get();

    const blocks = snapshot.docs.map((doc) => ({
      id: doc.id, 
      ...doc.data()
    }));
    
    res.send({blocks});
  } catch (error) {
    ;
    res.status(500).send("Internal Server Error");
  }
});

// Get blocks grouped by board (must come before /:id route)
router.get("/blocks/by-board", async (req, res) => {
  try {
    const userId = req.user.uid;

    // Fetch all non-deleted blocks for the user
    const snapshot = await db.collection("blocks")
      .where("userId", "==", userId)
      .where("deletedAt", "==", null)
      .orderBy("boardId", "asc")
      .orderBy("location.zIndex", "asc")
      .get();

    const blocks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Group blocks by boardId
    const blocksByBoard = {};
    blocks.forEach(block => {
      if (!blocksByBoard[block.boardId]) {
        blocksByBoard[block.boardId] = [];
      }
      blocksByBoard[block.boardId].push(block);
    });

    res.send({ blocksByBoard });
  } catch (error) {
    console.error("Error fetching blocks by board:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Get single block
router.get("/blocks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const userId = req.user.uid;
    const blockDoc = await db.collection("blocks").doc(id).get();
    
    if (!blockDoc.exists) {
      return res.status(404).send("Block not found");
    }
    
    const block = blockDoc.data();
    if (block.userId !== userId) {
      return res.status(403).send("Forbidden");
    }
    if (block.deletedAt !== null) {
      return res.status(404).send("Block not found");
    }
    
    res.send({block: { id: blockDoc.id, ...block }});
  } catch(error) {
    ;
    res.status(500).send("Internal Server Error");
  }
});

// Add block
router.post("/boards/:id/blocks", async (req, res) => {
  try {
    const blockData = req.body;
    const {id: boardId} = req.params;
    const userId = req.user.uid;

    // Verify board exists and belongs to user
    const boardDoc = await db.collection("boards").doc(boardId).get();
    if (!boardDoc.exists) {
      return res.status(404).send("Board not found");
    }
    
    const board = boardDoc.data();
    if (board.userId !== userId) {
      return res.status(403).send("Forbidden");
    }
    if (board.deletedAt !== null) {
      return res.status(404).send("Board not found");
    }

    const result = await createSingleBlock(boardId, blockData, userId);
    return res.status(201).send(result);
  } catch (error) {
    console.error("Error creating block:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Batch update blocks
router.patch("/blocks/batch", async (req, res) => {
  try {
    const userId = req.user.uid;
    const updatesArray = req.body;
    console.log("Received batch updates:", updatesArray);
    const result = await batchUpdateBlocks(updatesArray, userId);
    res.send({ success: true, ...result });
  } catch (error) {
    console.error("Error batch updating blocks:", error);
    if (error.message === "No updates provided") {
      return res.status(400).send(error.message);
    }
    if (error.message.includes("not found")) {
      return res.status(404).send(error.message);
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    return res.status(500).send("Internal Server Error");
  }
});


// Update single block
router.patch("/blocks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const updates = req.body;

    const block = await updateSingleBlock(id, updates, userId);
    res.send({block});
  } catch (error) {
    console.error("Error updating block:", error);
    if (error.message === "Block not found") {
      return res.status(404).send({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    if (error.message === "Block is deleted") {
      return res.status(404).send("Block is deleted");
    }
    return res.status(500).send("Internal Server Error");
  }
});

// Soft delete block
router.delete("/blocks/:id", async(req, res) => {
  try {
    const {id} = req.params;
    const userId = req.user.uid;
    
    const result = await deleteSingleBlock(id, userId);
    res.send({
      success: true, 
      ...result
    });
  } catch (error) {
    console.error("Error deleting block:", error);
    if (error.message === "Block not found") {
      return res.status(404).send({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    if (error.message === "Block is already deleted") {
      return res.status(404).send(error.message);
    }
    res.status(500).send("Internal Server Error");
  }
});

// Batch delete blocks
router.post("/blocks/batch-delete", async (req, res) => {
  try {
    const {blockIds} = req.body;
    const userId = req.user.uid;
    
    const result = await batchDeleteBlocks(blockIds, userId);
    res.send({ success: true, ...result });
  } catch (error) {
    console.error("Error batch deleting blocks:", error);
    if (error.message === "No block IDs provided") {
      return res.status(400).send(error.message);
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/boards/:id/blocks/batch", async (req, res) => {
  try {
    const { blocks: blocksData } = req.body;
    const { id: boardId } = req.params;
    const userId = req.user.uid;

    if (!blocksData || !Array.isArray(blocksData) || blocksData.length === 0) {
      return res.status(400).send("No blocks provided");
    }

    // Verify board exists and belongs to user
    const boardDoc = await db.collection("boards").doc(boardId).get();
    if (!boardDoc.exists) {
      return res.status(404).send("Board not found");
    }
    
    const board = boardDoc.data();
    if (board.userId !== userId) {
      return res.status(403).send("Forbidden");
    }
    if (board.deletedAt !== null) {
      return res.status(404).send("Board not found");
    }

    const result = await createBatchBlocks(boardId, blocksData, userId);
    return res.status(201).send(result);
  } catch (error) {
    console.error("Error creating batch blocks:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Restore deleted block
router.post("/blocks/:id/restore", async(req, res) => {
  try {
    const {id} = req.params;
    const userId = req.user.uid;
    const blockRef = db.collection("blocks").doc(id);
    const blockDoc = await blockRef.get();
    
    if (!blockDoc.exists) {
      return res.status(404).send({ error: "Block not found." });
    }
    
    const block = blockDoc.data();
    if (block.userId !== userId) {
      return res.status(403).send("Forbidden");
    }
    
    await blockRef.update({
      deletedAt: null,
      deletionId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (block.boardId) {
      await db.collection("boards").doc(block.boardId).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    const restored = await blockRef.get();
    res.send({block: { id: restored.id, ...restored.data() }});
  } catch (error) {
    ;
    res.status(500).send("Internal Server Error");
  }
});

// Permanently delete block
router.delete("/blocks/:id/permanent", async(req, res) => {
  try {
    const {id} = req.params;
    const userId = req.user.uid;
    
    const result = await permanentlyDeleteBlock(id, userId);
    res.send({
      success: true, 
      ...result
    });
  } catch (error) {
    console.error("Error permanently deleting block:", error);
    if (error.message === "Block not found") {
      return res.status(404).send({ error: error.message });
    }
    if (error.message === "Forbidden") {
      return res.status(403).send("Forbidden");
    }
    res.status(500).send("Internal Server Error");
  }
});

// Cleanup - permanently delete old soft-deleted items
router.delete("/cleanup", async (req, res) => {
  try {
    const userId = req.user.uid;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldBoards = await db.collection("boards")
      .where("userId", "==", userId)
      .where("deletedAt", "<=", thirtyDaysAgo)
      .get();

    const oldBlocks = await db.collection("blocks")
      .where("userId", "==", userId)
      .where("deletedAt", "<=", thirtyDaysAgo)
      .get();

    const batch = db.batch();

    oldBoards.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    oldBlocks.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.send({ 
      success: true, 
      deletedBoardCount: oldBoards.docs.length, 
      deletedBlockCount: oldBlocks.docs.length 
    });
  } catch (error) {
    ;
    res.status(500).send("Internal Server Error");
  } 
});

export default router;