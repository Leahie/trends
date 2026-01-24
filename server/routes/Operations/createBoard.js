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

const MAX_BOARDS = 5

/**
 * Create a new board
 */
export async function createBoard(title, parentBoardBlockId, userId) {

  const num_boards = await db.collection("boards")
      .where("userId", "==", userId)
      .get();

  if (num_boards > 5){
    throw new Error("Board limit reached. Upgrade your plan to create more boards."); 
  }
  // If parentBoardBlockId provided, verify it exists and belongs to user
  if (parentBoardBlockId) {
    const parentBlockDoc = await db.collection("blocks").doc(parentBoardBlockId).get();
    if (!parentBlockDoc.exists) {
      throw new Error("Parent board block not found");
    }
    const parentBlock = parentBlockDoc.data();
    if (parentBlock.userId !== userId) {
      throw new Error("Forbidden");
    }
    if (parentBlock.type !== "board_block") {
      throw new Error("Parent must be a board_block");
    }
  }

  const boardId = uuidv4();
  const boardData = {
    id: boardId, 
    userId, 
    title: title || "Untitled Board",
    colorscheme: DEFAULT_THEME,
    parentBoardBlockId: parentBoardBlockId || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedAt: null
  };
  
  await db.collection("boards").doc(boardId).set(boardData);

  // If creating as child, update the parent board_block to link to this board
  if (parentBoardBlockId) {
    await db.collection("blocks").doc(parentBoardBlockId).update({
      linkedBoardId: boardId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  return boardData;
}
