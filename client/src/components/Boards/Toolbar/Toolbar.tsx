    import { useEditor } from '@/context/editor';
    import { useData } from '@/context/data';
    import { getOperationsForBlock } from '@/components/Boards/Operations/operation';
    import type { Operation } from '@/types/editorTypes';
    import { Undo2, Redo2 } from 'lucide-react';
    import { useState } from 'react';
import Tool from './Tool';


    export default function Toolbar(){
        const { 
            selectedBlockType, 
            selectedBlock, 
            undo, 
            redo, 
            canUndo, 
            canRedo,
            pushToHistory,
            activeOverlay,
            setActiveOverlay
        } = useEditor();
        
        const {updateBlock} = useData(); // switch to batch update when selection works
        const [pendingOperation, setPendingOperation] = useState<Operation | null>(null);

        const operations = getOperationsForBlock(selectedBlockType);

        const displayOperations = selectedBlock ? operations : []; // no additional operations if no block selected

        const handleOperationClick = async(operation:Operation) => {
            if (!selectedBlock) return;

            if (operation.requiresOverlay) {
                // Skip for now 
            }else{
                const before = { ...selectedBlock };
                const updates = operation.apply(selectedBlock, {});
                const after = { ...selectedBlock, ...updates };
                
                await updateBlock(selectedBlock.id, updates);
                pushToHistory(selectedBlock.id, before, after);
                
                setActiveOverlay(null);
                setPendingOperation(null);
            }
        }

        return(
            <>
                <div className='fixed bottom-10 left-0 right-0 h-16 flex items-center justify-center gap-2 px-4 z-40'>
                    <div className='bg-dark px-5 py-2 rounded-xl'>
                        <div className={`flex gap-2 items-center  ${displayOperations.length>0 && "border-r border-gray-600 pr-4"} `}>
                            <button
                                onClick={undo}
                                disabled={!canUndo}
                                className={`px-3 py-2 rounded transition-colors ${
                                canUndo 
                                    ? ' hover:bg-highlight text-white' 
                                    : ' text-subtext cursor-not-allowed'
                                }`}
                                title="Undo"
                            >
                                <Undo2 size={18} />
                            </button>
                            <button
                                onClick={redo}
                                disabled={!canRedo}
                                className={`px-3 py-2 rounded transition-colors ${
                                canRedo 
                                    ? ' hover:bg-highlight text-white' 
                                    : ' text-subtext cursor-not-allowed'
                                }`}
                                title="Redo"
                            >
                                <Redo2 size={18} />
                            </button>
                        </div>
                        {
                            displayOperations.length>0 && (
                                <div className="flex gap-2 items-center flex-wrap">
                                {displayOperations.map((operation) => {
                                    const isActive = selectedBlock && (() => {
                                        // Check if the operation is currently active TO DO: better check T_T
                                        if (operation.id === 'bold') return (selectedBlock as any).content?.bold;
                                        if (operation.id === 'italic') return (selectedBlock as any).content?.italic;
                                        if (operation.id === 'underline') return (selectedBlock as any).content?.underline;
                                        if (operation.id === 'grayscale') return (selectedBlock as any).content?.transforms?.grayscale;
                                        return false;
                                    })();

                                    return (
                                        <Tool operation={operation} selectedBlock={selectedBlock} handleOperationClick={handleOperationClick} />
                                    );
                                    })}
                                </div>
                            )
                        }
                    </div>
                </div>
            </>
        )
    }