import React, {useState, useMemo, useRef, useEffect, useContext, createContext, useCallback} from 'react';
import type { ReactNode } from 'react';
import type { Block, Board  } from '../types';
import {api} from "../utils/api"
import { useAuth } from './auth';
import { v4 as uuidv4 } from 'uuid';



interface DataContextType {
    // Current board
    currentBoard: Board | null;
    setCurrentBoardId: (boardId: string) => void;

    // Boards
    boards: Board[];
    archivedBoards: Board[];
    loadBoards: () => Promise<void>;
    loadArchivedBoards: () => Promise<void>;
    createBoard: (title?: string) => Promise<Board | null>;
    restoreBoard: (boardId: string) => Promise<boolean>;
    archiveBoard: (boardId: string) => Promise<boolean>;
    deleteBoard: (boardId: string) => Promise<boolean>;
    updateBoard: (boardId: string, updates: Partial<Board>) => Promise<boolean>;
    
    // Blocks for current board
    blocks: Block[];
    dataMap: Record<string, Block>; 

    // Block operations
    updateBlock: (id: string, updates: Partial<Block>) => void;
    addBlock: (block: Partial<Block>) => Promise<boolean>; 
    removeBlock: (id: string) => Promise<boolean>;
    duplicateBlock: (blockId: string, targetBoardId?: string) => Promise<boolean>;

    // Batch operations
    batchUpdateBlocks: (updates: Record<string, Partial<Block>>) => Promise<boolean>;
    batchDeleteBlocks: (blockIds: string[]) => Promise<boolean>;

    // Syncing
    syncNow: () => Promise<void>;
    isSyncing: boolean; 
    lastSyncTime: Date | null;
    hasPendingChanges: boolean;
    boardLoadError: string | null;
}

// context is created? 
const DataContext = createContext<DataContextType | undefined>(undefined);

// provider component 
export function DataProvider({children} : {children : ReactNode}){
    const {user} = useAuth();
    console.log(user?.getIdToken())
    const [boards, setBoards] = useState<Board[]>([]);
    const [archivedBoards, setArchivedBoards] = useState<Board[]>([]);
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
    const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
    
    const [blocks, setBlocks] = useState<Block[]>([]);
    
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [boardLoadError, setBoardLoadError] = useState<string | null>(null);



    const pendingBlockChanges = useRef<Record<string, Partial<Block>>>({});
    const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasPendingChanges = Object.keys(pendingBlockChanges.current).length > 0;
    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;
            
            setIsSyncing(true);
            const result = await api.fetchBoards();
            
            if (result.success && result.data) {
                setBoards(result.data.boards);
                
                if (result.data.boards.length > 0) {
                    setCurrentBoardId(result.data.boards[0].id); // no board currently selected
                }
                
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
                setCurrentBoard(null);
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

        if (Object.keys(blockChanges).length === 0) return;

        setIsSyncing(true);
        let hasErrors = false;

        try {
            if (Object.keys(blockChanges).length > 0) {
                console.log("I AM REUPDATING HERE")
                const result = await api.batchUpdateBlocks(blockChanges);
                if (result.success) {
                    pendingBlockChanges.current = {};
                    setLastSyncTime(new Date());
                } else {
                    hasErrors = true;
                }
            }
        } catch (error) {
            console.error('Sync error:', error);
            hasErrors = true;
        } finally {
            setIsSyncing(false);
        }

        return !hasErrors;
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

    const createBoard = async (title?:string): Promise<Board | null> => {
        const result = await api.createBoard(title);
        if (result.success && result.data) {
            const newBoard = result.data.board;
            setBoards((prev:Board[]) => [newBoard, ...prev]);
            setCurrentBoardId(newBoard.id);
            return newBoard;
        }
        return null;
    }

    const archiveBoard = async (boardId: string): Promise<boolean> => {
        const result = await api.deleteBoard(boardId);
        if (result.success) {
            setBoards((prev: Board[]) => prev.filter(b => b.id !== boardId));
            if (currentBoardId === boardId){
                setCurrentBoardId(boards[0]?.id || null); // set it to null if no boards
            }
            return true;
        }
        return false;
    }

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
            setBoards((prev: Board[]) => prev.filter(b => b.id !== boardId));
            if (currentBoardId === boardId){
                setCurrentBoardId(boards[0]?.id || null); // set it to null if no boards
            }
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


    const addBlock = async(block: Partial<Block>): Promise<boolean> => {
        console.log(currentBoardId)
        if (!currentBoardId) return false; // i.e. not event on a board rn
        
        const blockId = block.id || uuidv4();
        const targetBoardId = block.boardId || currentBoardId;
        const newBlock: Block = {
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
            ...block
        } as Block;


        setBlocks((prev: Block[]) => [...prev, newBlock]);
        console.log("here's my info", currentBoardId, block)
        // Persist to server for the explicit target board
        const result = await api.addBlock(targetBoardId, newBlock);
                
        if (!result.success) {
            // Rollback everything on failure
            setBlocks((prev:Block[]) => prev.filter((b) => b.id !== blockId));
            console.error('Failed to add block:', result.error);
            return false;
        }
        
        if (result.data) {
            setBlocks((prev: Block[]) => prev.map(b => b.id === blockId ? result.data!.block : b));
        }
    
        return true;
    }

    const removeBlock = async(id: string): Promise<boolean> =>{
        const block: (Block | undefined) = blocks.find((b: Block) => b.id == id);
        if (!block) return false;
  
        setBlocks((prev: Block[]) => prev.filter(b => b.id !== id));

        delete pendingBlockChanges.current[id];

        const result = await api.deleteBlock(id);

        if (!result.success){
            setBlocks((prev: Block[]) => ([...prev, block]));
            console.error('Failed to delete block:', result.error);
            return false;
        }

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
        setBlocks((prev: Block[]) => {
            const newBlocks = prev.map(b => {
                if (!updates[b.id]) return b;
                
                return {
                    ...b,
                    location: {
                        ...b.location,
                        ...(updates[b.id].location || {})
                    }
                } as Block;
            });
            
            console.log('New blocks after batch update:', newBlocks);
            return newBlocks;
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

        setBlocks((prev: Block[]) => prev.filter(b => !blockIds.includes(b.id)));

        blockIds.forEach(id => delete pendingBlockChanges.current[id]);

        const result = await api.batchDeleteBlocks(blockIds);

        if (!result.success){
            setBlocks((prev: Block[]) => [...prev, ...deletedBlocks]);
            console.error('Batch delete failed', result.error);
            return false;
        }
        return true;

    }

    return (
        <DataContext.Provider value = {{
            currentBoard, setCurrentBoardId, boards, archivedBoards,
            loadBoards, loadArchivedBoards, createBoard, archiveBoard, restoreBoard, deleteBoard, updateBoard: updateBoardFunc, 
            blocks, dataMap,
            updateBlock, addBlock, removeBlock, duplicateBlock, batchUpdateBlocks, batchDeleteBlocks,
            syncNow, isSyncing, lastSyncTime, hasPendingChanges,
            boardLoadError 
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

