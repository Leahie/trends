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

export function EditorProvider({children, updateBlock} : {children : ReactNode; updateBlock: (id: string, updates: Partial<Block>) => void}){
    const { blocks, batchUpdateBlocks } = useData();
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


