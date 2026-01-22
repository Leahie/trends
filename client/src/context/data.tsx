import {useState, useMemo, useRef, useEffect, useContext, createContext, useCallback} from 'react';
import type { ReactNode } from 'react';
import type { Block, Board, TextBlockType, ImageBlockType, BoardBlockType  } from '../types/types';
import {api} from "../utils/api"
import { useAuth } from './auth';
import { useSidebar } from './sidebar';
import { v4 as uuidv4 } from 'uuid';
import { useParams } from "react-router-dom";
import type { BoardTree } from '@/types/sidebarTreeTypes';

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
    pushBlocksToBoard: (blockIds: string[], targetBoardBlockId: string) => Promise<boolean>;

    
    // Blocks for current board
    blocks: Block[];
    dataMap: Record<string, Block>; 

    // Block operations 
    getBlocks: () => Promise<Block[]| null>;
    updateBlock: (id: string, updates: Partial<Block>) => void;
    addBlock: (block: Partial<Block>) => Promise<Block | null>; 
    removeBlock: (id: string) => Promise<boolean>;
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
    checkedHelp: boolean;
    updateCheckedHelp: (checked: boolean) => Promise<boolean>;

    // Helpers 
    getParent: (boardId: string) => Board | null;
    getChildren: (boardId: string) => Board[];
    isRootBoard: (boardId: string) => boolean;
    loadBoardBlocks: (boardId: string) => Promise<void>;

    // Sidebar Board Tree 
    boardTree: BoardTree;
    openBoardInTree: (boardId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({children} : {children : ReactNode}){
    const { id } = useParams();
    const {user} = useAuth();
    const { pruneOpenBoards } = useSidebar();
    const [boards, setBoards] = useState<Board[]>([]);
    const [archivedBoards, setArchivedBoards] = useState<Board[]>([]);
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
    const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
    const [boardsHydrated, setBoardsHydrated] = useState(false);
    
    const [blocks, setBlocks] = useState<Block[]>([]);
    
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [boardLoadError, setBoardLoadError] = useState<string | null>(null);

    const [userRole, setUserRole] = useState<string>('user');
    const [boardLimit, setBoardLimit] = useState(5);
    const [checkedHelp, setCheckedHelp] = useState<boolean>(false);
    
    const [blocksByBoard, setBlocksByBoard] = useState<Record<string, Block[]>>({});
    const [allBlocks, setAllBlocks] = useState<Block[]>([]);

    // Board Tree structure
    const [boardTree, setBoardTree] = useState<BoardTree>({
        nodes: {},
        rootOrder: []
    });

    
    const pendingBlockChanges = useRef<Record<string, Partial<Block> | Partial<TextBlockType> | Partial<ImageBlockType> | Partial<BoardBlockType>>>({});
    const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasPendingChanges = Object.keys(pendingBlockChanges.current).length > 0;
    const userVerified = user?.emailVerified || false;

    useEffect(() => {
        if (id) {
            setCurrentBoardId(id);
        }
    }, [id]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;
            
            const userData = await api.fetchUserInfo();
            if (userData.success && userData.data) {
                setUserRole(userData.data.role);
                setBoardLimit(userData.data.boardLimit);
                setCheckedHelp(userData.data.checkedHelp || false);
            }

            setIsSyncing(true);
            const result = await api.fetchBoards();
            
            if (result.success && result.data) {
                setBoards(result.data.boards);
                setLastSyncTime(new Date());
            } else {
                console.error('Failed to load boards:', result.error);
            }

            // Load all blocks for the user
            await loadAllBlocksData();
            
            setIsSyncing(false);
            setBoardsHydrated(true);
        };
        
        loadInitialData();
    }, [user]);

    // Load all blocks for the user and the blocksByBoard mapping
    const loadAllBlocksData = async () => {
        try {
            // Fetch all blocks
            const allBlocksResult = await api.fetchBlocks();
            if (allBlocksResult.success && allBlocksResult.data) {
                setAllBlocks(allBlocksResult.data.blocks);
            }

            // Fetch blocks grouped by board
            const blocksByBoardResult = await api.fetchBlocksByBoard();
            if (blocksByBoardResult.success && blocksByBoardResult.data) {
                setBlocksByBoard(blocksByBoardResult.data.blocksByBoard);
            }
        } catch (error) {
            console.error('Failed to load all blocks data:', error);
        }
    };

    useEffect(() => {
        if (!boardsHydrated) return;
        pruneOpenBoards(boards.map(b => b.id));
    }, [boards, boardsHydrated, pruneOpenBoards]);

    // Load blocks for current board
    useEffect(() => {
        const loadBoardBlocks = async () => {
            if (!currentBoardId) {
                setBlocks([]);
                setBoardLoadError(null);
                return;
            }

            setIsSyncing(true);
            setBoardLoadError(null);

            const boardResult = await api.fetchBoard(currentBoardId);
            
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
                const loadedBlocks = blocksResult.data?.blocks ?? [];
                setBlocks(loadedBlocks);
            } else {
                console.error('Failed to load blocks:', blocksResult.error);
                setBlocks([]);
            }
            
            setIsSyncing(false);
        };

        loadBoardBlocks();
    }, [currentBoardId]);

    // Expose a way to load blocks for a specific board (for sidebar)
    const loadBoardBlocks = useCallback(async (boardId: string) => {
        const blocksResult = await api.fetchBlocksFromBoard(boardId);
        if (blocksResult.success && blocksResult.data) {
            const loadedBlocks = blocksResult.data?.blocks ?? [];
            setBlocksByBoard(prev => ({
                ...prev,
                [boardId]: loadedBlocks
            }));
        }
    }, []);

    const dataMap = useMemo(() => {
        return Object.fromEntries(blocks.map((b) => [b.id, b]));
    }, [blocks]);

    const boardsMap = useMemo(() => {
        return Object.fromEntries(boards.map((b) => [b.id, b]));
    }, [boards]);

    const scheduledSync = useCallback(() => {
        if (syncTimeout.current){
            clearTimeout(syncTimeout.current);
        }
        syncTimeout.current = setTimeout(async () => {
            await performSync();
        }, 2000);
    }, []);

    const performSync = async () => {
        const blockChanges = {...pendingBlockChanges.current};

        if (Object.keys(blockChanges).length === 0) return true;

        setIsSyncing(true);

        try {
            const result = await api.batchUpdateBlocks(blockChanges);
            if (result.success) {
                pendingBlockChanges.current = {};
                setLastSyncTime(new Date());
                
                // Reload all blocks data after sync to ensure accuracy
                await loadAllBlocksData();
                
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
    };

    useEffect(() => {
        const interval = setInterval(() => {
            performSync();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

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
        setBoardsHydrated(true);
    };

    const loadArchivedBoards = async () => {
        setIsSyncing(true);
        const result = await api.fetchArchivedBoards();
        if (result.success && result.data) {
            setArchivedBoards(result.data.boards);
        }
        setIsSyncing(false);
    };

    const createBoard = async (title?:string, parentBoardBlockId?: string): Promise<Board | null> => {
        const result = await api.createBoard(title, parentBoardBlockId);
        if (result.success && result.data) {
            const newBoard = result.data.board;
            setBoards((prev:Board[]) => [newBoard, ...prev]);
            return newBoard;
        }
        return null;
    };

    const archiveBoard = async (boardId: string): Promise<boolean> => {
        const result = await api.deleteBoard(boardId);
        
        if (!result.success || !result.data) return false;

        const { boards: deletedBoardIds = [], blocks: deletedBlockIds = [] } = result.data;

        setBoards(prev => {
            const next = prev.filter(b => !deletedBoardIds.includes(b.id));
            
            if (currentBoardId && deletedBoardIds.includes(currentBoardId)) {
                setCurrentBoardId(next[0]?.id || null);
            }
            
            return next;
        });

        setBlocks(prev => prev.filter(b => !deletedBlockIds.includes(b.id)));

        deletedBlockIds.forEach(blockId => {
            delete pendingBlockChanges.current[blockId];
        });

        // Reload all blocks data after deletion
        await loadAllBlocksData();

        return true;
    };

    const restoreBoard = async(boardId: string): Promise<boolean> => {
        const result = await api.restoreBoard(boardId);
        if (result.success) {
            const restoredBoard = archivedBoards.find(b => b.id === boardId);
            setArchivedBoards(prev => prev.filter(b => b.id !== boardId));
            
            if (restoredBoard) {
                setBoards(prev => [
                    { ...restoredBoard, deletedAt: null, deletionId: null }, 
                    ...prev
                ]);
            }
            
            await loadAllBlocksData();
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
            
            await loadAllBlocksData();
            return true;
        }
        return false;
    };

    const updateBoardFunc = async (boardId: string, updates : Partial<Board>): Promise<boolean> =>{
        setBoards((prev: Board[]) => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));
        if (currentBoardId === boardId){
            setCurrentBoard((prev: Board | null) => prev ? { ...prev, ...updates } : null);
        }

        const result = await api.updateBoard(boardId, updates);
        if (result.success && result.data){
            setBoards((prev: Board[]) => prev.map(b => b.id === boardId ? result.data!.board : b));
            if (currentBoardId === boardId){
                setCurrentBoard(result.data.board);
            }
            return true;
        }
        return false;
    };

    const pushBlocksToBoard = async (blockIds: string[], targetBoardBlockId: string): Promise<boolean> => {
        if (!currentBoardId) return false;
        
        const result = await api.pushBlocksToBoard(currentBoardId, blockIds, targetBoardBlockId);
        
        if (!result.success || !result.data) return false;

        const { movedBlockIds } = result.data;

        setBlocks(prev => prev.filter(b => !movedBlockIds.includes(b.id)));

        await loadAllBlocksData();
        return true;
    };

    // BLOCK OPS
    const getBlocks = async():Promise<Block[] | null> => {
        const result = await api.fetchBlocks();
        if (result.success && result.data){
            return result.data.blocks;
        }
        return null;
    };
    
    const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
        setBlocks((prev:Block[]) => 
            prev.map(b => b.id === id ? { ...b, ...updates } as Block : b)
        );
        
        const mergedUpdate = {
            ...(pendingBlockChanges.current[id] || {}),
            ...(updates as Partial<Block>)
        } as unknown as Partial<Block>;
        pendingBlockChanges.current[id] = mergedUpdate;
        
        scheduledSync();
    }, [scheduledSync]);

    const addBlock = async(block: Partial<Block>): Promise<Block | null> => {
        if (!currentBoardId) return null;
        
        const blockId = block.id ?? uuidv4();
        const targetBoardId = block.boardId || currentBoardId;

        const resolvedType: Block['type'] = (block.type as Block['type']) || 'text';

        let content: Block['content'];
        if (resolvedType === 'text') {
            const defaultText = { title: 'Untitled', body: '' };
            content = { ...defaultText, ...(block as any).content };
        } else if (resolvedType === 'image') {
            const defaultImage = {
                title: 'Untitled',
                url: '',
                source: 'external' as const,
                imgWidth: 0,
                imgHeight: 0,
            };
            content = { ...defaultImage, ...(block as any).content };
        } else {
            const defaultBoardBlock = { title: 'Untitled' };
            content = { ...defaultBoardBlock, ...(block as any).content };
        }
        
        const newBlock: Block = {
            ...(block as Partial<Block>),
            id : blockId, 
            boardId: targetBoardId, 
            userId: user?.uid || '', 
            type: resolvedType,
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
            content,
            linkedBoardId: block.linkedBoardId || null, 
            deletedAt: null, 
            deletionId: null, 
            createdAt: null, 
            updatedAt: null, 
        } as Block;

        setBlocks((prev: Block[]) => [...prev, newBlock]);
        
        const result = await api.addBlock(targetBoardId, newBlock);
                
        if (!result.success) {
            setBlocks((prev:Block[]) => prev.filter((b) => b.id !== blockId));
            console.error('Failed to add block:', result.error);
            return null;
        }
        
        if (result.data) {
            const serverBlock = result.data.block;
            setBlocks((prev: Block[]) => prev.map(b => b.id === blockId ? serverBlock : b));
           
            if (result.data?.board) {
                const newBoard = result.data.board;
                if (newBoard) {
                    setBoards((prev:Board[]) => [newBoard, ...prev]);
                }
            }
        }

        await loadAllBlocksData();
        return result.data!.block;
    };

    const removeBlock = async(id: string): Promise<boolean> =>{
        const result = await api.deleteBlock(id);
    
        if (!result.success || !result.data) return false;

        const { boards: deletedBoardIds = [], blocks: deletedBlockIds = [] } = result.data;

        setBlocks(prev => prev.filter(b => !deletedBlockIds.includes(b.id)));

        if (deletedBoardIds.length > 0) {
            setBoards(prev => prev.filter(b => !deletedBoardIds.includes(b.id)));
            setArchivedBoards(prev => prev.filter(b => !deletedBoardIds.includes(b.id)));

            if (currentBoardId && deletedBoardIds.includes(currentBoardId)) {
                const remainingBoards = boards.filter(b => !deletedBoardIds.includes(b.id));
                setCurrentBoardId(remainingBoards[0]?.id || null);
            }
        }

        deletedBlockIds.forEach(blockId => {
            delete pendingBlockChanges.current[blockId];
        });

        await loadAllBlocksData();
        return true;
    };
    
    const batchUpdateBlocks = async (updates: Record<string, Partial<Block>>): Promise<boolean> => {
        setBlocks(prev =>
            prev.map(b => {
                if (!updates[b.id]) return b;
                const { type, ...rest } = updates[b.id]!;
                return { ...b, ...rest } as Block;
            })
        );
            
        Object.entries(updates).forEach(([id, update]) => {
            const { type, ...rest } = update;
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

        await loadAllBlocksData();
        return true;
    };

    const batchDeleteBlocks = async (blockIds: string[]): Promise<boolean> => {
        const deletedBlocks = blocks.filter(b => blockIds.includes(b.id));
        setBlocks(prev => prev.filter(b => !blockIds.includes(b.id)));

        blockIds.forEach(id => delete pendingBlockChanges.current[id]);

        const result = await api.batchDeleteBlocks(blockIds);

        if (!result.success || !result.data) {
            setBlocks(prev => [...prev, ...deletedBlocks]);
            console.error('Batch delete failed', result.error);
            return false;
        }

        const { boards: deletedBoardIds = [], blocks: deletedBlockIds = [] } = result.data;

        setBlocks(prev => prev.filter(b => !deletedBlockIds.includes(b.id)));

        if (deletedBoardIds.length > 0) {
            setBoards(prev => prev.filter(b => !deletedBoardIds.includes(b.id)));
            setArchivedBoards(prev => prev.filter(b => !deletedBoardIds.includes(b.id)));

            if (currentBoardId && deletedBoardIds.includes(currentBoardId)) {
                const remainingBoards = boards.filter(b => !deletedBoardIds.includes(b.id));
                setCurrentBoardId(remainingBoards[0]?.id || null);
            }
        }

        deletedBlockIds.forEach(blockId => {
            delete pendingBlockChanges.current[blockId];
        });

        await loadAllBlocksData();
        return true;
    };

    const batchAddBlocks = async (blocksToAdd: Partial<Block>[]): Promise<Block[]> => {
        if (!currentBoardId) return [];
        
        const newBlocks: Block[] = [];
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
        
        setBlocks((prev: Block[]) => [...prev, ...newBlocks]);

        const result = await api.batchAddBlocks(currentBoardId, blocksWithIds);
        
        if (!result.success) {
            const newBlockIds = new Set(newBlocks.map(b => b.id));
            setBlocks((prev: Block[]) => prev.filter(b => !newBlockIds.has(b.id)));
            console.error('Failed to batch add blocks:', result.error);
            return [];
        }
        
        if (result.data?.blocks) {
            const serverBlocks = result.data.blocks;
            const serverBlockMap = new Map(serverBlocks.map((b:Block) => [b.id, b]));
            
            setBlocks((prev: Block[]) => 
                prev.map(b => serverBlockMap.get(b.id) || b)
            );
        }

        if (result.data?.boards && result.data.boards.length > 0) {
            setBoards(prev => [...result.data!.boards!, ...prev]);
        }

        await loadAllBlocksData();
        return result.data?.blocks || newBlocks;
    };

    const restoreBlock = async (id: string): Promise<boolean> => {
        const result = await api.restoreBlock(id);
        
        if (result.success && result.data) {
            const restoredBlock = result.data.block;
            
            if (restoredBlock.boardId === currentBoardId) {
                setBlocks(prev => [...prev, restoredBlock]);
            }
        
            await loadAllBlocksData();
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
        const boardBlocks = blocksByBoard[boardId] || [];
        const childBoardBlocks = boardBlocks.filter(
            b => b.type === 'board_block' && b.linkedBoardId
        );
        return childBoardBlocks
            .map(block => boardsMap[block.linkedBoardId!])
            .filter(Boolean) as Board[];
    }, [boardsMap, blocksByBoard]);

    const isRootBoard = useCallback((boardId: string): boolean => {
        const board = boardsMap[boardId];
        return board ? !board.parentBoardBlockId : false;
    }, [boardsMap]);

    const updateCheckedHelp = async (checked: boolean): Promise<boolean> => {
        const result = await api.updateCheckedHelp(checked);
        if (result.success) {
            setCheckedHelp(checked);
            return true;
        }
        return false;
    };

    return (
        <DataContext.Provider value = {{
            currentBoard, setCurrentBoardId, boards, archivedBoards,
            loadBoards, loadArchivedBoards, createBoard, archiveBoard, restoreBoard, deleteBoard, updateBoard: updateBoardFunc, 
            blocks, dataMap, getBlocks,
            updateBlock, addBlock, removeBlock, batchUpdateBlocks, batchDeleteBlocks, restoreBlock,
            syncNow, isSyncing, lastSyncTime, hasPendingChanges,
            boardLoadError, userRole, boardLimit, canCreateBoard, userVerified, checkedHelp, updateCheckedHelp,
            getParent,
            getChildren,
            boardsMap,
            batchAddBlocks,
            isRootBoard,
            loadBoardBlocks,
            pushBlocksToBoard
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