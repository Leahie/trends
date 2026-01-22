import { admin, db } from "../../firebase.js";

/**
 * Update a board, handling parent board_block title sync
 */
export async function updateBoard(boardId, updates, userId) {
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error("No updates provided");
  }

  const boardRef = db.collection("boards").doc(boardId);
  const boardDoc = await boardRef.get();

  if (!boardDoc.exists) {
    throw new Error("Board not found");
  }

  const board = boardDoc.data();
  if (board.userId !== userId) {
    throw new Error("Forbidden");
  }
  if (board.deletedAt !== null) {
    throw new Error("Board is deleted");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await boardRef.update({...updates, updatedAt: now});

  // Update the parent board block's title when board title changes
  if (updates.title && board.parentBoardBlockId) {
    const parentBlockRef = db.collection("blocks").doc(board.parentBoardBlockId);
    const parentBlockDoc = await parentBlockRef.get();
    
    if (parentBlockDoc.exists) {
      const parentBlock = parentBlockDoc.data();
      await parentBlockRef.update({
        'content.title': updates.title,
        updatedAt: now
      });
      
      // Also update the parent board's timestamp
      if (parentBlock.boardId) {
        await db.collection("boards").doc(parentBlock.boardId).update({
          updatedAt: now
        });
      }
    }
  }

  const updatedBoardDoc = await boardRef.get();
  return { id: updatedBoardDoc.id, ...updatedBoardDoc.data() };
}
