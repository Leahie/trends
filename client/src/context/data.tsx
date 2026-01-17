import React, {useState, useMemo, useRef, useEffect, useContext, createContext, useCallback} from 'react';
import type { ReactNode } from 'react';
import type { Block, Board  } from '../types/types';
import {api} from "../utils/api"
import { useAuth } from './auth';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useNavigate } from "react-router-dom";



interface DataContextType {
    // Current board
    currentBoard: Board | null;
    setCurrentBoardId: (boardId: string) => void;

    // Boards
    boards: Board[];
    archivedBoards: Board[];
    boardsMap: Record<string, Board>;

    loadBoards: () => Promise<void>;
    loadArchivedBoards: () => Promise<void>;
    createBoard: (title?: string, parentBoardBlockId?:string) => Promise<Board | null>;
    restoreBoard: (boardId: string) => Promise<boolean>;
    archiveBoard: (boardId: string) => Promise<boolean>;
    deleteBoard: (boardId: string) => Promise<boolean>;
    updateBoard: (boardId: string, updates: Partial<Board>) => Promise<boolean>;
    
    // Blocks for current board
    blocks: Block[];
    dataMap: Record<string, Block>; 

    // Block operations 
    getBlocks: () => Promise<Block[]| null>;
    updateBlock: (id: string, updates: Partial<Block>) => void;
    addBlock: (block: Partial<Block>) => Promise<Block | null>; 
    removeBlock: (id: string) => Promise<boolean>;
    duplicateBlock: (blockId: string, targetBoardId?: string) => Promise<boolean>;
    restoreBlock: (id: string) => Promise<boolean>;

    // Batch operations
    batchUpdateBlocks: (updates: Record<string, Partial<Block>>) => Promise<boolean>;
    batchDeleteBlocks: (blockIds: string[]) => Promise<boolean>;
    batchAddBlocks: (blocks: Partial<Block>[]) => Promise<Block[]>;


    // Syncing
    syncNow: () => Promise<void>;
    isSyncing: boolean; 
    lastSyncTime: Date | null;
    hasPendingChanges: boolean;
    boardLoadError: string | null;

    // User info
    userRole: string;
    boardLimit: number;
    canCreateBoard: boolean;
    userVerified: boolean;

    // Helpers 
    getParent: (boardId: string) => Board | null;
    getChildren: (boardId: string) => Board[];
    isRootBoard: (boardId: string) => boolean;
}

// context is created? 
const DataContext = createContext<DataContextType | undefined>(undefined);

// provider component 
export function DataProvider({children} : {children : ReactNode}){
    const { id } = useParams();
    const navigate = useNavigate();
    const {user} = useAuth();
    const [boards, setBoards] = useState<Board[]>([]);
    const [archivedBoards, setArchivedBoards] = useState<Board[]>([]);
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
    const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
    
    const [blocks, setBlocks] = useState<Block[]>([]);
    
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [boardLoadError, setBoardLoadError] = useState<string | null>(null);

    const [userRole, setUserRole] = useState<string>('user');
    const [boardLimit, setBoardLimit] = useState(5);
    const [allBlocks, setAllBlocks] = useState<Block[]>([]);

    const pendingBlockChanges = useRef<Record<string, Partial<Block>>>({});
    const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasPendingChanges = Object.keys(pendingBlockChanges.current).length > 0;
    // is user email verified
    const userVerified = user?.emailVerified || false;

    useEffect(() => {
        if (id) {
            setCurrentBoardId(id);
        }
    }, [id]);

    useEffect(() => {
        const loadAllBlocks = async () => {
            if (!user) return;
            const result = await getBlocks();
            if (result) {
            setAllBlocks(result);
            }
        };
        loadAllBlocks();
    }, [user]);

    useEffect(() => {
        setAllBlocks(prev => {
            const filtered = prev.filter(b => b.boardId !== currentBoardId);

            // Merge filtered + blocks and dedupe by id
            const merged = [...filtered, ...blocks];
            const deduped = Array.from(new Map(merged.map(b => [b.id, b])).values());

            return deduped;
        });
    }, [blocks, currentBoardId]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;
            
            const userData = await api.fetchUserInfo();
            if (userData.success && userData.data) {
                setUserRole(userData.data.role);
                setBoardLimit(userData.data.boardLimit);
            }

            setIsSyncing(true);
            const result = await api.fetchBoards();
            
            if (result.success && result.data) {
                setBoards(result.data.boards);
                
                // if (!id && result.data.boards.length > 0) {
                //     navigate(`/boards/${result.data.boards[0].id}`, { replace: true });
                // }
                
                setLastSyncTime(new Date());
            } else {
                console.error('Failed to load boards:', result.error);
            }
            setIsSyncing(false);
        };
        
        loadInitialData();
    }, [user]);

    useEffect(() => {
        console.trace(); 
        const loadBoardBlocks = async () => {
            if (!currentBoardId) {
                setBlocks([]);
                setBoardLoadError(null);
                return;
            }

            setIsSyncing(true);
            setBoardLoadError(null);

            const boardResult = await api.fetchBoard(currentBoardId);
            
            // error 
            if (!boardResult.success) {
                console.error('Failed to load board:', boardResult.error);
                
                setBoardLoadError(currentBoardId);
                setCurrentBoard(null); 
                setBlocks([]);
                setIsSyncing(false);
                return; 
        }

            if (boardResult.success && boardResult.data) {
                setCurrentBoard(boardResult.data.board);
            }
            
            const blocksResult = await api.fetchBlocksFromBoard(currentBoardId);
            if (blocksResult.success && blocksResult.data) {
                setBlocks(blocksResult.data.blocks);
            } else {
                console.error('Failed to load blocks:', blocksResult.error);
                setBlocks([]);
            }
            
            setIsSyncing(false);
        };

        loadBoardBlocks();
    }, [currentBoardId]);

    const dataMap = useMemo(() => {
        return Object.fromEntries(blocks.map((b) => [b.id, b]));
    }, [blocks]);

    const boardsMap = useMemo(() => {
        return Object.fromEntries(boards.map((b) => [b.id, b]));
    }, [boards]);

    const scheduledSync = useCallback( () => {
        if (syncTimeout.current){
            clearTimeout(syncTimeout.current);
        }
        syncTimeout.current = setTimeout(async () => {
            await performSync();
        }, 2000);
    }, [])

    const performSync = async () => {
        const blockChanges = {...pendingBlockChanges.current};

        if (Object.keys(blockChanges).length === 0) return true;

        setIsSyncing(true);

        try {
            const result = await api.batchUpdateBlocks(blockChanges);
            if (result.success) {
                pendingBlockChanges.current = {};
                setLastSyncTime(new Date());
                return true;
            }
            console.error('Sync failed:', result.error);
            return false;
        } catch (error) {
            console.error('Sync error:', error);
            return false;
        } finally {
            setIsSyncing(false);
        }
    };
    
    const syncNow = async () => {
        if (syncTimeout.current){
            clearTimeout(syncTimeout.current);
        }
        await performSync();   
    }

    useEffect(() => {
        const interval = setInterval(() => {
            performSync();
        }, 30000);

        return () => clearInterval(interval);
    }, [])
    


    // Board Operations 

    const canCreateBoard = useMemo(() => {
        if (userRole === 'admin') return true;
        return boards.length < boardLimit;
    }, [boardLimit, boards.length, userRole]);

    const loadBoards = async () => {
        setIsSyncing(true);
        const result = await api.fetchBoards();
        if (result.success && result.data) {
            setBoards(result.data.boards);
        }
        setIsSyncing(false);
    };

    const loadArchivedBoards = async () => {
        setIsSyncing(true);
        const result = await api.fetchArchivedBoards();
        if (result.success && result.data) {
            setArchivedBoards(result.data.boards);
        }
        setIsSyncing(false);
    }

    const createBoard = async (title?:string, parentBoardBlockId?: string): Promise<Board | null> => {
        const result = await api.createBoard(title, parentBoardBlockId);
        if (result.success && result.data) {
            const newBoard = result.data.board;
            setBoards((prev:Board[]) => [newBoard, ...prev]);
            return newBoard;
        }
        return null;
    }

    const archiveBoard = async (boardId: string): Promise<boolean> => {
        const result = await api.deleteBoard(boardId);
        
        if (!result.success || !result.data) return false;

        const { boards: deletedBoardIds = [], blocks: deletedBlockIds = [] } = result.data;

        // Remove all deleted boards from state
        setBoards(prev => {
            const next = prev.filter(b => !deletedBoardIds.includes(b.id));
            
            // If current board was deleted, switch to first remaining board
            if (currentBoardId && deletedBoardIds.includes(currentBoardId)) {
                setCurrentBoardId(next[0]?.id || null);
            }
            
            return next;
        });

        setBlocks(prev => prev.filter(b => !deletedBlockIds.includes(b.id)));

        deletedBlockIds.forEach(blockId => {
            delete pendingBlockChanges.current[blockId];
        });

        return true;
    };

    const restoreBoard = async(boardId: string): Promise<boolean> => {
        const result = await api.restoreBoard(boardId);
    if (result.success) {
        // Remove from archived list
        const restoredBoard = archivedBoards.find(b => b.id === boardId);
        setArchivedBoards(prev => prev.filter(b => b.id !== boardId));
        
        // Add back to active boards
        if (restoredBoard) {
            setBoards(prev => [
                { ...restoredBoard, deletedAt: null, deletionId: null }, 
                ...prev
            ]);
        }
        
        return true;
    }
    return false;
    };

    const deleteBoard = async (boardId: string): Promise<boolean> => {
        const result = await api.permanentlyDeleteBoard(boardId);
        if (result.success) {
            setBoards(prev => {
                const next = prev.filter(b => b.id !== boardId);

                if (currentBoardId === boardId) {
                setCurrentBoardId(next[0]?.id || null);
                }

                return next;
            });
            setArchivedBoards((prev: Board[]) => prev.filter(b => b.id !== boardId));    
            return true;
        }
        return false;
    }

    const updateBoardFunc = async (boardId: string, updates : Partial<Board>): Promise<boolean> =>{
        // Optimistic update: update UI immediately
        setBoards((prev: Board[]) => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));
        if (currentBoardId === boardId){
            setCurrentBoard((prev: Board | null) => prev ? { ...prev, ...updates } : null);
        }

        // Then sync with server
        const result = await api.updateBoard(boardId, updates);
        if (result.success && result.data){
            // If server returns data, use it (in case there were server-side changes)
            setBoards((prev: Board[]) => prev.map(b => b.id === boardId ? result.data!.board : b));
            if (currentBoardId === boardId){
                setCurrentBoard(result.data.board);
            }
            return true;
        }
        return false;
    }

    // BLOCK OPPSSSS
    const getBlocks = async():Promise<Block[] | null> => {
        const result = await api.fetchBlocks();
        if (result.success && result.data){
            return result.data.blocks;
        }
        return null;
    }
    
    // UPDATING THE BLOCK

    const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
        setBlocks((prev:Block[]) => 
            prev.map(b => b.id === id ? { ...b, ...updates } as Block : b)
        )
        
        pendingBlockChanges.current[id] = {
            ...(pendingBlockChanges.current[id] || {}),
            ...updates 
        }
        
        scheduledSync();
    }, [scheduledSync]);


    const addBlock = async(block: Partial<Block>): Promise<Block | null> => {
        if (!currentBoardId) return null; // i.e. not event on a board rn
        
        const blockId = block.id ?? uuidv4();

        const targetBoardId = block.boardId || currentBoardId;
        const newBlock: Block = {
            ...block,
            id : blockId, 
            boardId: targetBoardId, 
            userId: user?.uid || '', 
            type: block.type || 'text',
            location: {
                x: block.location?.x || 0, 
                y: block.location?.y || 0, 
                width: block.location?.width || 200, 
                height: block.location?.height || 200, 
                zIndex: block.location?.zIndex || 0, 
                rotation: block.location?.rotation || 0, 
                scaleX: block.location?.scaleX || 1, 
                scaleY: block.location?.scaleY || 1, 
            },
            
            content: block.content || {}, 
            linkedBoardId: block.linkedBoardId || null, 
            deletedAt: null, 
            deletionId: null, 
            createdAt: null, 
            updatedAt: null, 
        } as Block;


        setBlocks((prev: Block[]) => [...prev, newBlock]);
        // Persist to server for the explicit target board
        const result = await api.addBlock(targetBoardId, newBlock);
                
        if (!result.success) {
            // Rollback everything on failure
            setBlocks((prev:Block[]) => prev.filter((b) => b.id !== blockId));
            console.error('Failed to add block:', result.error);
            return null;
        }
        
        if (result.data) {
            setBlocks((prev: Block[]) => prev.map(b => b.id === blockId ? result.data!.block : b));
        }
    
        return result.data!.block;
    }

    const removeBlock = async(id: string): Promise<boolean> =>{
        const result = await api.deleteBlock(id);
    
        if (!result.success || !result.data) return false;

        const { boards: deletedBoardIds = [], blocks: deletedBlockIds = [] } = result.data;

        // Remove blocks from state
        setBlocks(prev => prev.filter(b => !deletedBlockIds.includes(b.id)));

        // Remove boards from state if any were cascade deleted
        if (deletedBoardIds.length > 0) {
            setBoards(prev => prev.filter(b => !deletedBoardIds.includes(b.id)));
            setArchivedBoards(prev => prev.filter(b => !deletedBoardIds.includes(b.id)));

            // If current board got deleted, switch to another board
            if (currentBoardId && deletedBoardIds.includes(currentBoardId)) {
                const remainingBoards = boards.filter(b => !deletedBoardIds.includes(b.id));
                setCurrentBoardId(remainingBoards[0]?.id || null);
            }
        }

        // Clean pending sync state for all deleted blocks
        deletedBlockIds.forEach(blockId => {
            delete pendingBlockChanges.current[blockId];
        });

        return true;
    }
    
    // DUPLICATE 
    const duplicateBlock = async (blockId: string, targetBoardId?: string): Promise<boolean> => {
        const result = await api.duplicateBlock(blockId, targetBoardId);
        if (result.success && result.data){
            const duplicatedBlock = result.data.block; 
            if (duplicatedBlock.boardId === currentBoardId){
                setBlocks((prev: Block[]) => [...prev, duplicatedBlock]);
            }
            return true;
        }
        return false;
    }

    const batchUpdateBlocks = async (updates: Record<string, Partial<Block>>): Promise<boolean> => {
        setBlocks(prev =>
            prev.map(b => {
                if (!updates[b.id]) return b;
                const { type, ...rest } = updates[b.id]!;

                return {
                    ...b,
                    ...rest
                } as Block; // cast explicitly
            })
        );
            
        Object.entries(updates).forEach(([id, update]) => {
            const { type, ...rest } = update; // strip out `type` so we don't touch it
                pendingBlockChanges.current[id] = {
                    ...(pendingBlockChanges.current[id] || {}),
                    ...rest
                } as Partial<Block>;    
        });

        const result = await api.batchUpdateBlocks(updates);

        if (!result.success){
            console.error('Batch update failed:', result.error);
            return false;
        }

        Object.keys(updates).forEach(blockId => {
            delete pendingBlockChanges.current[blockId];
        });

        return true;
    }

    const batchDeleteBlocks = async (blockIds: string[]): Promise<boolean> => {
        const deletedBlocks = blocks.filter(b => blockIds.includes(b.id));
        setBlocks(prev => prev.filter(b => !blockIds.includes(b.id)));

        blockIds.forEach(id => delete pendingBlockChanges.current[id]);

        const result = await api.batchDeleteBlocks(blockIds);

        if (!result.success || !result.data) {
            // Rollback on failure
            setBlocks(prev => [...prev, ...deletedBlocks]);
            console.error('Batch delete failed', result.error);
            return false;
        }

        const { boards: deletedBoardIds = [], blocks: deletedBlockIds = [] } = result.data;

        setBlocks(prev => prev.filter(b => !deletedBlockIds.includes(b.id)));

        if (deletedBoardIds.length > 0) {
            setBoards(prev => prev.filter(b => !deletedBoardIds.includes(b.id)));
            setArchivedBoards(prev => prev.filter(b => !deletedBoardIds.includes(b.id)));

            // If current board got deleted, switch
            if (currentBoardId && deletedBoardIds.includes(currentBoardId)) {
                const remainingBoards = boards.filter(b => !deletedBoardIds.includes(b.id));
                setCurrentBoardId(remainingBoards[0]?.id || null);
            }
        }

        deletedBlockIds.forEach(blockId => {
            delete pendingBlockChanges.current[blockId];
        });

        return true;
    }

    const batchAddBlocks = async (blocksToAdd: Partial<Block>[]): Promise<Block[]> => {
        if (!currentBoardId) return [];
        
        const newBlocks: Block[] = [];
        
        // Create all blocks with IDs
        const blocksWithIds = blocksToAdd.map(block => {
            const blockId = block.id ?? uuidv4();
            const targetBoardId = block.boardId || currentBoardId;
            
            const newBlock: Block = {
                ...block,
                id: blockId,
                boardId: targetBoardId,
                userId: user?.uid || '',
                type: block.type || 'text',
                location: {
                    x: block.location?.x || 0,
                    y: block.location?.y || 0,
                    width: block.location?.width || 200,
                    height: block.location?.height || 200,
                    zIndex: block.location?.zIndex || 0,
                    rotation: block.location?.rotation || 0,
                    scaleX: block.location?.scaleX || 1,
                    scaleY: block.location?.scaleY || 1,
                },
                content: block.content || {},
                linkedBoardId: block.linkedBoardId || null,
                deletedAt: null,
                deletionId: null,
                createdAt: null,
                updatedAt: null,
            } as Block;
            
            newBlocks.push(newBlock);
            return newBlock;
        });
        
        // Optimistically update UI
        setBlocks((prev: Block[]) => [...prev, ...newBlocks]);
        
        // Persist to server
        const result = await api.batchAddBlocks(currentBoardId, blocksWithIds);
        
        if (!result.success) {
            // Rollback on failure
            const newBlockIds = new Set(newBlocks.map(b => b.id));
            setBlocks((prev: Block[]) => prev.filter(b => !newBlockIds.has(b.id)));
            console.error('Failed to batch add blocks:', result.error);
            return [];
        }
        
        if (result.data?.blocks) {
            // Update with server response
            const serverBlocks = result.data.blocks;
            const serverBlockMap = new Map(serverBlocks.map((b:Block) => [b.id, b]));
            
            setBlocks((prev: Block[]) => 
                prev.map(b => serverBlockMap[b.id] || b)
            );
            
            return serverBlocks;
        }
        
        return newBlocks;
    };

    const restoreBlock = async (id: string): Promise<boolean> => {
        const result = await api.restoreBlock(id);
        
        if (result.success && result.data) {
            const restoredBlock = result.data.block;
            
            // Add block back to state if it belongs to current board
            if (restoredBlock.boardId === currentBoardId) {
                setBlocks(prev => [...prev, restoredBlock]);
            }
            
            return true;
        }
        return false;
    };


    const getParent = useCallback((boardId: string): Board | null => {
        const board = boardsMap[boardId];
        if (!board?.parentBoardBlockId) return null;
        
        const parentBlock = allBlocks.find(b => b.id === board.parentBoardBlockId);
        if (!parentBlock?.boardId) return null;
        
        return boardsMap[parentBlock.boardId] || null;
    }, [boardsMap, allBlocks]);

    const getChildren = useCallback((boardId: string): Board[] => {
        const boardBlocks = allBlocks.filter(
            b => b.type === 'board_block' && b.boardId === boardId && b.linkedBoardId
        );


        
        return boardBlocks
            .map(block => boardsMap[block.linkedBoardId!])
            .filter(Boolean) as Board[];
    }, [boardsMap, allBlocks]);

    const isRootBoard = useCallback((boardId: string): boolean => {
        const board = boardsMap[boardId];
        return board ? !board.parentBoardBlockId : false;
    }, [boardsMap]);


    return (
        <DataContext.Provider value = {{
            currentBoard, setCurrentBoardId, boards, archivedBoards,
            loadBoards, loadArchivedBoards, createBoard, archiveBoard, restoreBoard, deleteBoard, updateBoard: updateBoardFunc, 
            blocks, dataMap, getBlocks,
            updateBlock, addBlock, removeBlock, duplicateBlock, batchUpdateBlocks, batchDeleteBlocks, restoreBlock,
            syncNow, isSyncing, lastSyncTime, hasPendingChanges,
            boardLoadError, userRole, boardLimit, canCreateBoard, userVerified,
            getParent,
            getChildren,
            boardsMap,
            batchAddBlocks,
            isRootBoard
            }}>
            {children}
        </DataContext.Provider>
    );
}
export function useData(){
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider")
    }
    return context;
}

