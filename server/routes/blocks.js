/// Backend does not test the validity of the added items, it just updates what it's told to update
import express from "express";
import { admin, db } from "../firebase.js";
import { authenticateUser } from "../middleware/auth.js";


const router = express.Router();
import { v4 as uuidv4 } from 'uuid';



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
    console.log("Error getting shared board:", error);
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
    console.log("Error fetching blocks:", error);
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


// new api for getting soft deleted boards
router.get("/boards/archived", async(req, res) => {
  try {
    const userId = req.user.uid;
    const archivedSnapshot = await db.collection("boards")
        .where("userId", "==", userId)
        .where("deletedAt", "!=", null)  // Only deleted boards
        .orderBy("deletedAt", "desc")     // Most recently deleted first
        .get();

      const boards = archivedSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          };
      });

      res.send({boards});

  }catch (error) {
    console.log("Error getting archived boards:", error);
    res.status(500).send("Internal Server Error");
  }
});
// fetch data '/data' route get

router.get("/boards", async(req, res) => {
  try{
      const userId = req.user.uid;
      const blocksSnapshot = await db.collection("boards")
      .where("userId", "==", userId)
      .where("deletedAt", "==", null)
      .orderBy("updatedAt", "desc")
      .get();


      const boards = blocksSnapshot.docs.map((doc) => 
        {
          const data = doc.data()
          return {
            id: doc.id,
            ...data
          }
        });

      res.send({boards});
  }catch (error) {
      console.log("Error getting blocks and locations:", error);
      res.status(500).send("Internal Server Error");
  }


})

router.get("/boards/:boardId", async(req, res) => {
  try{
      const { boardId } = req.params;
      const userId = req.user.uid;

      const boardDoc = await db.collection("boards").doc(boardId).get();
      if (!boardDoc.exists){
        return res.status(404).send("Board not found");
      }

      const board = boardDoc.data();
      if (board.userId !== userId){
        return res.status(403).send("Forbidden");
      }

      if (board.deletedAt !== null){
        return res.status(404).send("Board not found");
      }

      res.send({board: { id: boardDoc.id, ...board }});
  }catch (error) {
      console.log("Error getting blocks and locations:", error);
      res.status(500).send("Internal Server Error");
  }


})

// create board '/boards' route post
router.post("/boards", async (req, res) => {
  try{
  const {title, parentBoardBlockId} = req.body;
  const userId = req.user.uid;

  // if parentdBoardBlockId is provided, verify it exists and belongs to user
  if (parentBoardBlockId){
    const parentBlockDoc = await db.collection("blocks").doc(parentBoardBlockId).get();
    if (!parentBlockDoc.exists){
      return res.status(404).send("Parent board block not found");
    }
    const parentBlock = parentBlockDoc.data();
    if (parentBlock.userId !== userId){
      return res.status(403).send("Forbidden");
    }
    if (parentBlock.type !== "board_block"){
      return res.status(400).send("Parent block is not a board block");
    }
  }


  const boardId = uuidv4();
  const boardData = {
    id: boardId, 
    userId, 
    title: title || "Untitled Board",
    colorscheme: DEFAULT_THEME,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedAt: null
  };
  await db.collection("boards").doc(boardId).set(boardData);

  if (parentBoardBlockId) {
      await db.collection("blocks").doc(parentBoardBlockId).update({
        linkedBoardId: boardId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }
  res.status(201).send({board: boardData});
}
  catch (error){
    console.log("Error creating board:", error);
    res.status(500).send("Internal Server Error");
  }
});


// update board 'boards/id' route patch
router.patch("/boards/:id", async (req, res) => {
  
  try{
    const { id } = req.params;
    const userId = req.user.uid;
    const updates = req.body;

    if (!updates){
      return res.status(400).send("No updates provided.");
    }
    const boardRef = db.collection("boards").doc(id);
    const boardDoc = await boardRef.get();

    if (!boardDoc.exists) {
      return res.status(404).send({ error: "Board not found." });
    } 

    const board = boardDoc.data();
    if (board.userId !== userId){
      return res.status(403).send("Forbidden");
    }
    if (board.deletedAt !== null){
      return res.status(404).send("Board is deleted");
    }

    await boardRef.update({...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp()});
    const updatedBoardDoc = await boardRef.get();
    res.send({board: { id: updatedBoardDoc.id, ...updatedBoardDoc.data() }});
  } catch (error) {
    console.log("Error updating board:", error);
    return res.status(500).send("Internal Server Error");
  }
})

// delete board 'boards/id' route delete
router.delete("/boards/:id", async(req, res)=>{
  try{
    const { id } = req.params;
    const userId = req.user.uid;
    const boardRef = db.collection("boards").doc(id);
    const boardDoc = await boardRef.get();

    if (!boardDoc.exists) {
      return res.status(404).send({ error: "Board not found." });
    }

    const board = boardDoc.data();

    if (board.userId !== userId){
      return res.status(403).send("Forbidden");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const deletedId = uuidv4();
    await boardRef.update({deletedAt: now, deletionId: deletedId});

    const blocksSnapshot = await db.collection("blocks")
    .where("boardId", "==", id)
    .where("deletedAt", "==", null)
    .get();

    const batch = db.batch();
    const childBoardsToDelete = [];

    blocksSnapshot.docs.forEach((doc)=>{
      batch.update(doc.ref, {
        deletedAt: now, deletionId: deletedId
      });

      if (block.type === "board_block" && block.linkedBoardId) {
        childBoardsToDelete.push(block.linkedBoardId);
      }
    })

    await batch.commit();
    let totalDeletedBlocks = blocksSnapshot.docs.length;
    for (const childBoardId of childBoardsToDelete) {
      const childResult = await deleteBoardRecursively(childBoardId, userId, deletionId);
      totalDeletedBlocks += childResult.deletedBlockCount;
    }

    res.send({success: true, 
      boardId:id, 
      deletedId,
      deletedBlockCount: blocksSnapshot.docs.length
    });
  }catch (error){
    console.log("Error deleting board:", error);
    res.status(500).send("Internal Server Error");
  }
});

async function deleteBoardRecursively(boardId, userId, deletionId) {
  const boardRef = db.collection("boards").doc(boardId);
  const boardDoc = await boardRef.get();

  if (!boardDoc.exists) {
    return { deletedBlockCount: 0 };
  }

  const board = boardDoc.data();
  if (board.userId !== userId) {
    throw new Error("Forbidden");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await boardRef.update({deletedAt: now, deletionId: deletionId});
  const blocksSnapshot = await db.collection("blocks")
    .where("boardId", "==", boardId)
    .where("deletedAt", "==", null)
    .get();
  const batch = db.batch();
  const childBoardsToDelete = [];

  blocksSnapshot.docs.forEach((doc) => {
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

  let totalDeletedBlocks = blocksSnapshot.docs.length;
  for (const childBoardId of childBoardsToDelete) {
    const childResult = await deleteBoardRecursively(childBoardId, userId, deletionId);
    totalDeletedBlocks += childResult.deletedBlockCount;
  }

  return { deletedBlockCount: totalDeletedBlocks };
}

// Restore deleted boards (for undo) 'boards/:boardId/restore' route post
router.post("/boards/:boardId/restore", async(req, res)=>{
  try{
    const {boardId} = req.params;
    const userId = req.user.uid;

    const boardRef = db.collection("boards").doc(boardId);
    const boardDoc = await boardRef.get();

    if (!boardDoc.exists) {
      return res.status(404).send({ error: "Board not found." });
    }

    const board = boardDoc.data();

    if (board.userId !== userId){
      return res.status(403).send("Forbidden");
    }

    const deletionId = board.deletionId;

    await boardRef.update({
      deletedAt: null, 
      deletionId: null, 
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (deletionId){
      const blocksSnapshot = await db.collection("blocks")
      .where("boardId", "==", boardId)
      .where("deletionId", "==", deletionId)
      .get();
      const batch = db.batch();
      blocksSnapshot.docs.forEach((doc)=>{
        batch.update(doc.ref, {
          deletedAt: null, 
          deletionId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()});
      });
      await batch.commit();
      res.send({success: true, boardId, restoredBlocksCount: blocksSnapshot.docs.length});
    } 
    else {
      res.send({success: true, boardId, restoredBlocksCount: 0});
    }   
  }catch (error){
    console.log("Error restoring board:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Permanently delete boards 'boards/:boardId/permanent' route delete
router.delete("/boards/:boardId/permanent", async(req, res)=>{
  try{
    const { boardId } = req.params;
    const userId = req.user.uid;
    const boardRef = db.collection("boards").doc(boardId);
    const boardDoc = await boardRef.get();
    
    if (!boardDoc.exists) {
      return res.status(404).send({ error: "Board not found." });
    }
    const board = boardDoc.data();

    if (board.userId !== userId){
      return res.status(403).send("Forbidden");
    }
    const blocksSnapshot = await db.collection("blocks")
    .where("boardId", "==", boardId)
    .get();

    const batch = db.batch();
    blocksSnapshot.docs.forEach((doc)=>{
      batch.delete(doc.ref);
    });
    await batch.commit();
    await boardRef.delete();

    res.send({success: true,
      boardId, 
      deletedBlockCount: blocksSnapshot.docs.length
    });
  }catch (error){
    console.log("Error permanently deleting board:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Spreading, flatten board block move all child blocks onto parent board and deleted board block 
router.post("/boards/:boardId/blocks/:blockId/spread", async (req, res) => {
  try {
    const { boardId, blockId } = req.params;
    const userId = req.user.uid;

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

    const childBlocksSnapshot = await db.collection("blocks")
    .where("boardId", "==", linkedBoardId)
    .where("deletedAt", "==", null)
    .get();

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

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

    batch.update(db.collection("blocks").doc(blockId), {
      deletedAt: now,
      updatedAt: now
    });

    batch.update(db.collection("boards").doc(linkedBoardId), {
      deletedAt: now
    });

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
    console.log("Error spreading board block:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/boards/:boardId/blocks/push", async (req, res) => {
  try {
    const {blockId} = req.body;
    const {blockIds, targetBoardBlockId} = req.body;
    const userId = req.user.uid;

    if (!blockIds || !Array.isArray(blocksIds) || blockIds.length === 0){
      return res.status(400).send("No block IDs provided");
    }

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

    const blockDocs = await Promise.all(
      blockIds.map(id => db.collection("blocks").doc(id).get())
    );

    for (const doc of blockDocs){
      if (!doc.exists){
        return res.status(404).send(`Block with ID ${doc.id} not found`);
      }
      const block = doc.data();
      if (block.userId !== userId){
        return res.status(403).send("Forbidden");
      }
      if (block.boardId !== boardId){
        return res.status(400).send(`Block with ID ${doc.id} does not belong to specified board`);
      }
    }

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const offsetX = targetBlock.location.x;
    const offsetY = targetBlock.location.y;

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

    batch.update(db.collection("boards").doc(targetBoardId), {updatedAt: now});
    batch.update(db.collection("boards").doc(boardId), {updatedAt: now});

    await batch.commit();

    res.send({
      success: true,
      movedBlockIds: blockIds,
      targetBlockId
    })
    
  } catch (error) {
    console.log("Error pushing blocks to board:", error);
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
        console.log("Error revoking share link:", error);
        res.status(500).send("Internal Server Error");
    }
});
/// BLOCK ROUTES BELOW 

// get route for blocks '/blocks/:boardId/blocks
router.get("/boards/:boardId/blocks",  async (req, res) => {
  try{
    const { boardId } = req.params;
    const userId = req.user.uid;
    
    if (!boardId){
      return res.status(400).send("Board ID is required.");
    }

    const boardDoc = await db.collection("boards").doc(boardId).get();
    if (!boardDoc.exists){
      return res.status(404).send("Board not found");
    }

    const board = boardDoc.data();
    if (board.userId !== userId){
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
  }catch (error){
    console.log("Error fetching blocks:", error);
    res.status(500).send("Internal Server Error");
  }
});

// get block '/blocks/id' route get
router.get("/blocks/:id", async (req, res) => {
  const { id } = req.params;
  try{
    const userId = req.user.uid;
    const blockDoc = await db.collection("blocks").doc(id).get();
    if (!blockDoc.exists){
      return res.status(404).send("Block not found");
    }
    const block = blockDoc.data();
    if (block.userId !== userId){
      return res.status(403).send("Forbidden");
    }
    if (block.deletedAt !== null){
      return res.status(404).send("Block not found");
    }
    res.send({block: { id: blockDoc.id, ...block }});
  }
  catch(error){
    console.log("Error fetching block:", error);
    res.status(500).send("Internal Server Error");
  }
});


// add block '/blocks' route post

router.post("/boards/:id/blocks", async (req, res) => {
  try{
    const blockData = req.body;
    const {id : boardId} = req.params;
    const userId = req.user.uid;

    // verify board exists and belongs to user
    const boardDoc = await db.collection("boards").doc(boardId).get();
    if (!boardDoc.exists){
      return res.status(404).send("Board not found");
    }
    const board = boardDoc.data();
    if (board.userId !== userId){
      return res.status(403).send("Forbidden");
    }
    if (board.deletedAt !== null){
      return res.status(404).send("Board not found");
    }

    // choose id: use provided id when present (makes creation idempotent), otherwise generate
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
      // content 
      content: blockData.content || {},

      // linked board for boardblocks 
      linkedBoardId: blockData.linkedBoardId || null,
      deletedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    if (newBlock.type === "board_block" && !newBlock.linkedBoardId){
      await db.collection("boards").doc(newBlock.linkedBoardId).update({
        parentBoardBlockId: blockId, 
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

  
    await db.collection("blocks").doc(blockId).set(newBlock); 
    await db.collection("boards").doc(boardId).update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return res.status(201).send({ block: newBlock });
  }catch (error) {
    console.log("Error adding block and location:", error);
    res.status(500).send("Internal Server Error");
  }
  
});

// Batch update multiple blocks '/blocks/batch' route patch
router.patch("/blocks/batch", async (req, res) => {
  try{
    const userId = req.user.uid;
    const updatesArray = req.body;

    if (!updatesArray || Object.keys(updatesArray).length === 0){
      return res.status(400).send("No updates provided.");
    }

    const blockIds = Object.keys(updatesArray);
    const blockDocs = await Promise.all(
      blockIds.map((id) => db.collection("blocks").doc(id).get())
    )

    const blockDataMap = {};
    const boardIds = new Set();

    for (const doc of blockDocs){
      if (!doc.exists){
        return res.status(404).send(`Block with ID ${doc.id} not found.`);
      }
      const block = doc.data();
      blockDataMap[doc.id] = block

      if (block.userId !== userId){
        return res.status(403).send("Forbidden");
      }

      if (block.deletedAt !== null){
        return res.status(404).send(`Block with ID ${doc.id} is deleted.`);
      }

      boardIds.add(block.boardId);
    }

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

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
    });

    boardIds.forEach((boardId) => {
      const boardRef = db.collection("boards").doc(boardId);
      batch.update(boardRef, { updatedAt: now });
    });

    await batch.commit();

    res.send({ success: true, updatedBlockIds: Object.keys(updatesArray), affectedBoards: Array.from(boardIds) });
  }
  catch (error){
    console.log("Error in batch updating blocks:", error);
    return res.status(500).send("Internal Server Error");
  }
})

// update block '/blocks/id' route patch
router.patch("/blocks/:id", async (req, res) => {
  try{
    const { id } = req.params;
    const userId = req.user.uid;
    const updates = req.body;

    const blockRef = db.collection("blocks").doc(id);
    const blockDoc = await blockRef.get();

    if (!blockDoc.exists) {
      return res.status(404).send({ error: "Block not found." });
    }

    const block = blockDoc.data();

    if (block.userId !== userId){
      return res.status(403).send("Forbidden");
    }

    if (block.deletedAt !== null){
      return res.status(404).send("Block is deleted");
    }

    const {boardId, ...safeUpdates} = updates;

    if (safeUpdates.location && block.location) {
      safeUpdates.location = {
        ...block.location,
        ...safeUpdates.location
      };
    }

    await blockRef.update({...safeUpdates, updatedAt: admin.firestore.FieldValue.serverTimestamp()});
    
    if (block.boardId){
      await db.collection("boards").doc(block.boardId).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    const updatedBlockDoc = await blockRef.get();
    res.send({block: { id: updatedBlockDoc.id, ...updatedBlockDoc.data() }});
  } catch (error) {
    console.log("Error updating block:", error);
    return res.status(500).send("Internal Server Error");
  }
});


// duplicate block '/blocks/id/duplicate' route post
router.post("/blocks/:id/duplicate", async (req, res) => {
  try{
    const { id } = req.params;
    const userId = req.user.uid;
    const {targetBoardId, offsetX = 20, offsetY = 20} = req.body;

    const originalDoc = await db.collection("blocks").doc(id).get();
    if (!originalDoc.exists){
      return res.status(404).send("Original block not found");
    }

    const originla = originalDoc.data();

    if (originla.userId !== userId){
      return res.status(403).send("Forbidden");
    }

    if (originla.deletedAt !== null){
      return res.status(404).send("Original block is deleted");
    } 

    const finalBoardId = targetBoardId || originla.boardId;
    const targetBoardDoc = await db.collection("boards").doc(finalBoardId).get();
    if (!targetBoardDoc.exists){
      return res.status(404).send("Target board not found");
    }
    const targetBoard = targetBoardDoc.data();
    if (targetBoard.userId !== userId){
      return res.status(403).send("Forbidden");
    }
    if (targetBoard.deletedAt !== null){
      return res.status(404).send("Target board is deleted");
    }

    const newId = uuidv4();
    const duplicate = {
      ...originla, 
      id: newId,
      boardId: finalBoardId,
      location: {
        ...original.location,
        x: original.location.x + offsetX,
        y: original.location.y + offsetY,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    await db.collection("blocks").doc(newId).set(duplicate);

    await db.collection("boards").doc(finalBoardId).update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.status(201).send({ block: duplicate });
  }catch (error){
    console.log("Error duplicating block:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Move block(s) to another board 
router.post("/blocks/move", async (req, res) => {
  try{
    const { blockIds, targetBoardId, offsetX = 0, offsetY = 0 } = req.body;
    const userId = req.user.uid;

    if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0){
      return res.status(400).send("No block IDs provided.");
    }

    if (!targetBoardId){
      return res.status(400).send("Target board ID is required.");
    }

    const targetBoardDoc = await db.collection("boards").doc(targetBoardId).get();
    if (!targetBoardDoc.exists){
      return res.status(404).send("Target board not found");
    }
    const targetBoard = targetBoardDoc.data();
    if (targetBoard.userId !== userId) {
      return res.status(403).send("Forbidden");
    }
    if (targetBoard.deletedAt !== null) {
      return res.status(404).send("Target board is deleted");
    }

    // verify all blocks exist and belong to user
    const blockDocs = await Promise.all(
      blockIds.map(id => db.collection("blocks").doc(id).get())
    );

    const sourceBoardIds = new Set();

    for (const doc of blockDocs) {
      if (!doc.exists) {
        return res.status(404).send(`Block ${doc.id} not found`);
      }
      const block = doc.data();
      if (block.userId !== userId) {
        return res.status(403).send("Forbidden");
      }
      sourceBoardIds.add(block.boardId);
    }

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();
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

    // Update timestamps on all affected boards
    sourceBoardIds.forEach(boardId => {
      batch.update(db.collection("boards").doc(boardId), { updatedAt: now });
    });
    batch.update(db.collection("boards").doc(targetBoardId), { updatedAt: now });

    await batch.commit();

    res.send({
      success: true,
      movedBlockIds: blockIds,
      targetBoardId,
      sourceBoardIds: Array.from(sourceBoardIds)
    });

  }
  catch (error){
    console.log("Error moving blocks:", error);
    res.status(500).send("Internal Server Error");
  }
});
  
// Copy 
// Paste 

// soft delete '/blocks/:id' route delete
router.delete("/blocks/:id", async(req, res)=>{
  try{
    const {id} = req.params;
    const userId = req.user.uid;
    const blockRef = db.collection("blocks").doc(id);
    const blockDoc = await blockRef.get();

    if (!blockDoc.exists) {
      return res.status(404).send({ error: "Block not found." });
    }

    const block = blockDoc.data();
    if (block.userId !== userId){
      return res.status(403).send("Forbidden");
    }

    if (block.deletedAt !== null){
      return res.status(404).send("Block is already deleted");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    if (block.boardId){
      await blockRef.update({
        deletedAt: now
      });
    }
    
    if (block.boardId){
      await db.collection("boards").doc(block.boardId).update({
        updatedAt: now
      });
    }
    res.send({success: true, id});
  } catch (error){
    console.log("Error deleting block:", error);
    res.status(500).send("Internal Server Error");
  }
});

// batch delete multiple blocks '/blocks/batch-delete' route delete
router.post("/blocks/batch-delete", async (req, res) => {
  try{
    const {blockIds} = req.body;
    const userId = req.user.uid;
    if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0){
      return res.status(400).send("No block IDs provided.");
    }

    const blockDocs = await Promise.all(
      blockIds.map((id) => db.collection("blocks").doc(id).get())
    );
    const boardIds = new Set();

    for (const doc of blockDocs){
      if (!doc.exists) continue;
      const block = doc.data();
      if (block.userId !== userId) 
        return res.status(403).send("Forbidden");
      boardIds.add(block.boardId);
    }

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    blockIds.forEach((id) => {
      const blockRef = db.collection("blocks").doc(id);
      batch.update(blockRef, { deletedAt: now });
    });

    boardIds.forEach((boardId) => {
      const boardRef = db.collection("boards").doc(boardId);
      batch.update(boardRef, { updatedAt: now });
    });
    await batch.commit();
    res.send({ success: true, deletedBlockIds: blockIds, affectedBoards: Array.from(boardIds) });
  }catch (error){
    console.log("Error in batch deleting blocks:", error);
    return res.status(500).send("Internal Server Error");
  }
});

// restore deleted block '/blocks/id/restore' route post
router.post("/blocks/:id/restore", async(req, res)=>{
  try{
    const {id} = req.params;
    const userId = req.user.uid;
    const blockRef = db.collection("blocks").doc(id);
    const blockDoc = await blockRef.get();
    if (!blockDoc.exists) {
      return res.status(404).send({ error: "Block not found." });
    }
    const block = blockDoc.data();
    if (block.userId !== userId){
      return res.status(403).send("Forbidden");
    }
    await blockRef.update({
      deletedAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (block.boardId){
      await db.collection("boards").doc(block.boardId).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    const restored = await blockRef.get();
    res.send({block: { id: restored.id, ...restored.data() }});
  } catch (error){
    console.log("Error restoring block:", error);
    res.status(500).send("Internal Server Error");
  }
});


// delete block '/blocks/id' route delete
router.delete("/blocks/:id/permanent", async(req, res)=>{
  try{
    const {id} = req.params;
    const userId = req.user.uid;

    const blocksRef = db.collection("blocks").doc(id);
    const blockDoc = await blocksRef.get();
    if (!blockDoc.exists) {
      return res.status(404).send({ error: "Block not found." });
    }

    const block = blockDoc.data();

    if (block.userId !== userId){
      return res.status(403).send("Forbidden");
    }

    await blocksRef.delete();

    res.send({success: true, id});
  }catch (error){
    console.log("Error deleting block and location:", error);
    res.status(500).send("Internal Server Error");
  }
})

// Cleanup route to permanently delete all blocks marked deleted longer than 30 days
router.delete("/cleanup", async (req, res) => {
  try{
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

    oldBoards.docs.forEach((doc)=>{
      batch.delete(doc.ref);
    });
    oldBlocks.docs.forEach((doc)=>{
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.send({ success: true, deletedBoardCount: oldBoards.docs.length, deletedBlockCount: oldBlocks.docs.length });
}catch (error){
    console.log("Error during cleanup:", error);
    res.status(500).send("Internal Server Error");
  } 
});


export default router;