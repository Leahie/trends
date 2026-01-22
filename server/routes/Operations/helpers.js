import { db } from "../../firebase.js";

/**
 * Check if moving a board would create a circular reference
 */
export async function wouldCreateCycle(userId, movingBoardId, targetBoardId) {
  let currentId = targetBoardId;

  while (currentId) {
    if (currentId === movingBoardId) return true;

    const doc = await db.collection("boards").doc(currentId).get();
    if (!doc.exists) break;

    const board = doc.data();
    if (board.userId !== userId) break;

    currentId = board.parentBoardBlockId
      ? (await db.collection("blocks").doc(board.parentBoardBlockId).get()).data()?.linkedBoardId
      : null;
  }

  return false;
}
