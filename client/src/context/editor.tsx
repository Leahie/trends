import React, {useState, useContext, useCallback, createContext, type ReactNode, useEffect, useMemo} from 'react';
import type { Block, BlockType } from "@/types/types";
import type { HistoryEntry, Operation } from "@/types/editorTypes";
import { useData } from './data';

interface EditorContextType{
    selectedBlockIds: string[]; 
    addToSelection: (id: string) => void;
    removeFromSelection: (id: string) => void;
    setSelection: (ids: string[]) => void;
    clearSelection: () => void;
    toggleSelection: (id:string) => void;

    // clipboard
    clipboard: Block[];
    copyBlocks: (blockIds: string[]) => void;
    cutBlocks: (blockIds: string[]) => void;
    pasteBlocks: (canvasX: number, canvasY: number, parentId: string) => Promise<void>;
 

    // text editing 
    isEditingText: boolean; 
    setIsEditingText: (editing: boolean) => void; 
    editingBlockId: string | null; 
    setEditingBlockId: (id: string | null) => void; 

    
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    canUndo: boolean;
    canRedo: boolean;

    pushToHistory: (before: Record<string, Block>, after: Record<string, Block>) => void;

    activeOverlay: string | null;
    setActiveOverlay: (overlayId: string | null) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);
const CLIPBOARD_KEY = 'board_clipboard';

export function EditorProvider({children, updateBlock} : {children : ReactNode; updateBlock: (id: string, updates: Partial<Block>) => void}){
    
    const { blocks, addBlock,  batchUpdateBlocks, batchDeleteBlocks } = useData();
    const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);

    const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
    const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
    const [isEditingText, setIsEditingText] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    
    // Use memo instead of taking a snapshot of it 
    // const selectedBlock = useMemo(() => {
    //     if (!selectedBlockIds) return null;
    //     return blocks.find(b => b.id === selectedBlockId) ?? null;
    // }, [blocks, selectedBlockId]);

    const [clipboard, setClipboard] = useState<Block[]>(() => {
        try {
            const stored = localStorage.getItem(CLIPBOARD_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(clipboard));
    }, [clipboard]);
    
    const addToSelection = (id:string) => {
        setSelectedBlockIds((prev)=>
            [...prev, id]
        )
    }
    const removeFromSelection = (id:string) => {
        setSelectedBlockIds(prev => 
            prev.filter(existingId => existingId != id)
        )
    }
    const setSelection = (ids: string[]) => {
        setSelectedBlockIds(ids);
    }
    const clearSelection = () => {
        setSelectedBlockIds([]);
    }
    const toggleSelection = (id:string) => {
        setSelectedBlockIds([id]);
    }


    useEffect(() => {
        if (selectedBlockIds.length==0){
            setIsEditingText(false);
            setEditingBlockId(null);
        }
    }, [selectedBlockIds])

    // clipboard ops
    const copyBlocks = useCallback((blockIds: string[]) => {
        const blocksToCopy = blocks.filter(b => blockIds.includes(b.id));
        // Create deep copies (snapshots) of the blocks
        const snapshots = blocksToCopy.map(block => structuredClone(block));
        setClipboard(snapshots);
    }, [blocks]);
    
    const cutBlocks = useCallback(async (blockIds: string[]) => {
        const blocksToCut = blocks.filter(b => blockIds.includes(b.id));
        const snapshots = blocksToCut.map(block => structuredClone(block));
        setClipboard(snapshots);
        
        // Delete the blocks
        await batchDeleteBlocks(blockIds);
        clearSelection();
    }, [blocks, batchDeleteBlocks, clearSelection]);

     const pasteBlocks = useCallback(async (canvasX: number, canvasY: number, parentId: string) => {
        if (clipboard.length === 0) return;

        // Calculate the center point of all clipboard blocks
        const minX = Math.min(...clipboard.map(b => b.location.x));
        const minY = Math.min(...clipboard.map(b => b.location.y));
        
        const newBlockIds: string[] = [];

        for (const block of clipboard) {
            // Calculate offset from original top-left corner
            const offsetX = block.location.x - minX;
            const offsetY = block.location.y - minY;

            const newBlock: Partial<Block> = {
                ...structuredClone(block),
                id: undefined, 
                boardId: parentId,
                location: {
                    ...block.location,
                    x: canvasX + offsetX,
                    y: canvasY + offsetY,
                    zIndex: 0 
                }
            };

            const result = await addBlock(newBlock);
            if (result) {
                newBlockIds.push(result.id);
            }
        }

        setSelection(newBlockIds);
    }, [clipboard, addBlock, setSelection]);


    // ctrl z + ctrl y ops
    const pushToHistory = useCallback((before: Record<string, Block>, after: Record<string, Block>) => {
        setUndoStack(prev => [...prev, {
            before,
            after,
            timestamp: Date.now()
        }]);
        setRedoStack([]);
    },[])

    const undo = useCallback(async()=>{
        if (undoStack.length === 0) return;

        const curr = undoStack[undoStack.length-1];

        await batchUpdateBlocks(
            Object.fromEntries(
                Object.entries(curr.before).map(([id, block]) => [
                    id, 
                    {location: block.location, content: block.content}
                ])
            )
        );

        setRedoStack(prev => [...prev, curr])
        setUndoStack(prev => prev.slice(0, -1));
        
    }, [undoStack, updateBlock, selectedBlockIds])

    const redo = useCallback(async () => {
        if (redoStack.length === 0) return;
        
        const entry = redoStack[redoStack.length - 1];
        
        await batchUpdateBlocks(
            Object.fromEntries(
            Object.entries(entry.after).map(([id, block]) => [
                id,
                { location: block.location, content: block.content }
            ])
            )
        );
        
        setUndoStack(prev => [...prev, entry]);
        setRedoStack(prev => prev.slice(0, -1));
        
    }, [redoStack, updateBlock, selectedBlockIds]);

    const value: EditorContextType = {
        selectedBlockIds: selectedBlockIds,
        addToSelection: addToSelection,
        removeFromSelection: removeFromSelection,
        setSelection: setSelection,
        clearSelection: clearSelection,
        toggleSelection: toggleSelection,

        clipboard,
        copyBlocks,
        cutBlocks,
        pasteBlocks,

        undoStack,
        redoStack,
        undo,
        redo,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        pushToHistory,
        activeOverlay,
        setActiveOverlay,

        // Specific for text blocks 
        isEditingText,
        setIsEditingText,
        editingBlockId,
        setEditingBlockId,
    }
    return (
        <EditorContext.Provider value={value}>
        {children}
        </EditorContext.Provider>
    );
}

export function useEditor(){
    const context = useContext(EditorContext);
    if (context === undefined) {
        throw new Error('useEditor must be used within EditorProvider');
    }
    return context;
}


