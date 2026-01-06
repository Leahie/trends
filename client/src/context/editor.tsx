import React, {useState, useContext, useCallback, createContext, type ReactNode} from 'react';
import type { Block, BlockType } from "@/types/types";
import type { HistoryEntry, Operation } from "@/types/editorTypes";

interface EditorContextType{
    selectedBlockId: string | null; 
    selectedBlockType: BlockType | null;
    selectedBlock: Block | null;
    setSelectedBlock: (block: Block | null) => void;
    
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    canUndo: boolean;
    canRedo: boolean;

    pushToHistory: (blockId: string, before: Block, after: Block) => void;

    activeOverlay: string | null;
    setActiveOverlay: (overlayId: string | null) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({children, updateBlock} : {children : ReactNode; updateBlock: (id: string, updates: Partial<Block>) => Promise<void>}){
    const [selectedBlock, setSelectedBlockState] = useState<Block | null>(null);
    const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
    const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

    const setSelectedBlock = useCallback((block: Block | null) => {
        setSelectedBlockState(block);
        setActiveOverlay(null);
    }, [])

    const pushToHistory = useCallback((blockId: string, before: Block, after: Block) => {
        setUndoStack(prev => [...prev, {
            blockId, before, after, timestamp: Date.now()
        }])
        setRedoStack([]);
    },[])

    const undo = useCallback(async()=>{
        if (undoStack.length === 0) return;

        const curr = undoStack[undoStack.length-1];
        await updateBlock(curr.blockId, curr.before);
        setRedoStack(prev => [...prev, curr])
        setUndoStack(prev => prev.slice(0, -1));
        
        if (selectedBlock?.id === curr.blockId) {
            setSelectedBlockState(curr.before);
        }
    }, [undoStack, updateBlock, selectedBlock])

    const redo = useCallback(async () => {
        if (redoStack.length === 0) return;
        
        const entry = redoStack[redoStack.length - 1];
        
        await updateBlock(entry.blockId, entry.after);
        
        setUndoStack(prev => [...prev, entry]);
        setRedoStack(prev => prev.slice(0, -1));
        
        if (selectedBlock?.id === entry.blockId) {
            setSelectedBlockState(entry.after);
        }
    }, [redoStack, updateBlock, selectedBlock]);

    const value: EditorContextType = {
        selectedBlockId: selectedBlock?.id || null,
        selectedBlockType: selectedBlock?.type || null,
        selectedBlock,
        setSelectedBlock,
        undoStack,
        redoStack,
        undo,
        redo,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        pushToHistory,
        activeOverlay,
        setActiveOverlay
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