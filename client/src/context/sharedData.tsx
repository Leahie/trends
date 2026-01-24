// import { createContext, useContext, useEffect, useState, useCallback} from "react";
// import type { ReactNode } from "react";
// import type { Block, Board } from "@/types/types";
// import { api } from "@/utils/api";
// import type { DataContextType } from "./data";

// export const SharedDataContext = createContext<DataContextType | undefined>(undefined);

// export function SharedDataProvider({
//     token, 
//     rootBoard,
//     children
// }:{
//     token: string;
//     rootBoard: Board;
//     children: ReactNode
// }){
//     const [currentBoard, setCurrentBoard] = useState<Board | null>(rootBoard);
//     const [boards, setBoards] = useState<Board[]>([rootBoard]);
//     const [archivedBoards] = useState<Board[]>([]);
//     const [blocks, setBlocks] = useState<Block[]>([]);
//     const [boardsMap, setBoardsMap] = useState<Record<string, Board>>({
//         [rootBoard.id]: rootBoard
//     });

//     const [boardLoadError, setBoardLoadError] = useState<string | null>(null);

//     const loadBoard = async (boardId: string) => {
//     const res = await api.fetchSharedBoardById(token, boardId);
//     if (!res.success || !res.data) {
//       setBoardLoadError(boardId);
//       return;
//     }

//     const { board, blocks, relatedBoards } = res.data;

//     setCurrentBoard(board);
//     setBlocks(blocks);

//     if (relatedBoards) {
//       setBoards(prev => {
//         const merged = [...prev];
//         relatedBoards.forEach(b => {
//           if (!merged.find(x => x.id === b.id)) merged.push(b);
//         });
//         return merged;
//       });

//       setBoardsMap(prev => {
//         const next = { ...prev };
//         relatedBoards.forEach(b => (next[b.id] = b));
//         return next;
//       });
//     }
//   };
// }