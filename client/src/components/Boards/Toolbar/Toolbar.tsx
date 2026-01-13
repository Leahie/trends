import { useEditor } from '@/context/editor';
import { useData } from '@/context/data';
import { getOperationsForBlockTypes } from '@/components/Boards/Operations/operation';
import type { Operation } from '@/types/editorTypes';
import { Undo2, Redo2, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Tool from './Tool';
import CropOverlay from './CropOverlay';
import type { Block, ImageBlockType } from '@/types/types';
import { getBlockTypes, getSelectionXStats } from '@/hooks/toolbarHooks';

interface ToolGroup {
  name: string;
  operations: Operation[];
  priority: number;
}

export default function Toolbar(){
    const { 
        selectedBlockIds, 
        undo, 
        redo, 
        canUndo, 
        canRedo,
        pushToHistory,
        activeOverlay,
        setActiveOverlay
    } = useEditor();
    
    const {updateBlock, batchUpdateBlocks, syncNow, dataMap} = useData(); // switch to batch update when selection works
    const [pendingOperation, setPendingOperation] = useState<Operation | null>(null);
    const [showOverflow, setShowOverflow] = useState(false);
    const [visibleGroups, setVisibleGroups] = useState<string[]>([]);
    const [overflowGroups, setOverflowGroups] = useState<string[]>([]);
    const [showCropOverlay, setShowCropOverlay] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);


    const selectedBlock = selectedBlockIds.length == 1 ? dataMap[selectedBlockIds[0]] : null;
    
    const types = getBlockTypes(selectedBlockIds, dataMap);
    const operations = getOperationsForBlockTypes(types, selectedBlockIds.length>1);
    
    const displayOperations = selectedBlockIds.length!=0 ? operations : []; // no additional operations if no block selected

    const groupedOperations: ToolGroup[] = displayOperations.reduce((acc, op) => {
        const existingGroup = acc.find(g => g.name === op.group);
        if (existingGroup) {
            existingGroup.operations.push(op);
        } else {
        acc.push({
            name: op.group,
            operations: [op],
            priority: op.priority || 999
        });
        }
        return acc;
  }, [] as ToolGroup[]).sort((a, b) => a.priority - b.priority);

    useEffect(() => {
        if (!toolbarRef.current || !contentRef.current) return;
        
        const calculateVisibleGroups = () => {
            const toolbarWidth = toolbarRef.current?.offsetWidth || 0;
            const undoRedoWidth = 120; 
            const overflowButtonWidth = 50;
            const groupSpacing = 16; 
            
            let availableWidth = toolbarWidth - undoRedoWidth - overflowButtonWidth - 40; // 40px padding
            const visible: string[] = [];
            const overflow: string[] = [];
            
            const buttonWidth = 44;
            
            for (const group of groupedOperations) {
                const groupWidth = (group.operations.length * buttonWidth) + groupSpacing;
                
                if (availableWidth >= groupWidth) {
                visible.push(group.name);
                availableWidth -= groupWidth;
                } else {
                overflow.push(group.name);
                }
            }
            
            setVisibleGroups(visible);
            setOverflowGroups(overflow);

        };
        
        calculateVisibleGroups();
        
        const resizeObserver = new ResizeObserver(calculateVisibleGroups);
        resizeObserver.observe(toolbarRef.current);
        
        return () => resizeObserver.disconnect();
    }, [groupedOperations]);

    const handleOperationClick = async(operation:Operation, params?:any) => {

        if (selectedBlockIds.length==0) return;
         if (operation.requiresOverlay) {
            if (operation.id === 'crop') {
            setShowCropOverlay(true);
            setPendingOperation(operation);
            }
            return;
        }
        if (operation.group == "alignment"){
            const { minX, maxX, centerX } = getSelectionXStats(selectedBlockIds, dataMap);

            if (operation.id == "align-right"){
                params = maxX;
            }
            else if (operation.id == "align-left"){
                params = minX;
            }
            else{
                params = centerX;
            }
        }
        const before: Record<string, Block> = {};
        const after: Record<string, Block> = {};
        const batchUpdates: Record<string, Partial<Block>> = {};

        for (const id of selectedBlockIds) {
            const block = dataMap[id];
            if (!block) continue;

            before[id] = structuredClone(block);

            const updates = operation.apply(block, params);
            after[id] = {
                ...block,
                ...updates,
                location: {
                    ...block.location,
                    ...(updates.location || {})
                },
                content: {
                    ...block.content,
                    ...(updates.content || {})
                }
            };

            batchUpdates[id] = updates;
        }

        await batchUpdateBlocks(batchUpdates);
        await syncNow();
        pushToHistory(before, after);

        setActiveOverlay(null);
        setPendingOperation(null);
    }

    const handleCropApply = async (crop: { xRatio: number; yRatio: number; widthRatio: number; heightRatio: number }) => {
        if (!selectedBlock || !pendingOperation) return;

        const before = { ...selectedBlock };
        const updates = pendingOperation.apply(selectedBlock, { crop });
        const after = { ...selectedBlock, ...updates };

        await updateBlock(selectedBlock.id, updates);
        pushToHistory(selectedBlock.id, before, after);
        
        setShowCropOverlay(false);
        setPendingOperation(null);
    };

    const handleCropCancel = () => {
        setShowCropOverlay(false);
        setPendingOperation(null);
    };

    const visibleOps = groupedOperations.filter(g => visibleGroups.includes(g.name));
    const overflowOps = groupedOperations.filter(g => overflowGroups.includes(g.name));

    return(
        <>
            <div ref={toolbarRef} 
            className='fixed bottom-5 left-0 right-0 flex items-center justify-center px-4 z-40 pointer-events-none opacity-30 hover:opacity-100'
>
                <div className='bg-dark px-5 py-2 rounded-xl pointer-events-auto'>
                    <div  ref={contentRef} className={`flex gap-2 items-center   `}>
                        <div className={`flex gap-2 items-center ${visibleOps.length>0 && "border-r border-gray-600 pr-4"} `}>
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className={`relative group px-3 py-2 rounded transition-colors ${
                            canUndo 
                                ? ' hover:bg-highlight text-white' 
                                : ' text-secondary cursor-not-allowed'
                            }`}
                        >
                            <Undo2 size={18} />
                            <span
                                className="
                                pointer-events-none
                                absolute
                                -top-2 left-1/2 -translate-x-1/2 -translate-y-full
                                whitespace-nowrap
                                rounded-md
                                bg-white/90
                                px-2 py-1
                                text-xs text-black
                                opacity-0
                                scale-95
                                transition-all
                                group-hover:opacity-100
                                group-hover:scale-100
                                "
                            >
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-white/90" />

                                Undo
                            </span>
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className={`relative group px-3 py-2 rounded transition-colors ${
                            canRedo 
                                ? ' hover:bg-highlight text-white' 
                                : ' text-secondary cursor-not-allowed'
                            }`}
                        >
                            <Redo2 size={18} />
                            <span
                                className="
                                pointer-events-none
                                absolute
                                -top-2 left-1/2 -translate-x-1/2 -translate-y-full
                                whitespace-nowrap
                                rounded-md
                                bg-white/90
                                px-2 py-1
                                text-xs text-black
                                opacity-0
                                scale-95
                                transition-all
                                group-hover:opacity-100
                                group-hover:scale-100
                                "
                            >
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-white/90" />

                                Redo
                            </span>
                        </button>
                    </div>
                    {
                        visibleOps.length>0 && (visibleOps.map((group, idx) =>(
                            <div key={group.name} className='flex gap-1 items-center'>
                                {group.operations.map((operation) => (
                                        <Tool 
                                            key={operation.id}
                                            operation={operation} 
                                            selectedBlock={selectedBlock}
                                            selectedBlockIds={selectedBlockIds} 
                                            handleOperationClick={handleOperationClick}
                                        />
                                ))}
                                        {idx < visibleOps.length - 1 && (
                                        <div className='w-px h-6 bg-gray-600 mx-2' />
                                        )}
                            </div>
                        ))
                        )
                    }

                    {overflowOps.length > 0 && (
                        <div className='relative border-l border-gray-600 pl-4'>
                            <button
                            onClick={() => setShowOverflow(!showOverflow)}
                            className='relative group px-3 py-2 rounded transition-colors hover:bg-highlight text-white'
                            >
                            <MoreHorizontal size={18} />
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-white/90 px-2 py-1 text-xs text-black opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100">
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/90" />
                                More tools
                            </span>
                            </button>
                            
                            {/* Overflow dropdown - opens UPWARD */}
                            {showOverflow && (
                            <div className='absolute bottom-full right-0 mb-5 bg-dark rounded-lg shadow-xl border border-gray-700 p-2 min-w-[200px]'>
                                {overflowOps.map((group, index) => (
                                <div key={group.name} className='mb-2 last:mb-0'>
                                    <div className='text-left text-xs text-subtext px-2 py-1 uppercase tracking-wide'>
                                    {group.name}
                                    </div>
                                    <div className='flex flex-wrap gap-1'>
                                    {group.operations.map((operation) => (
                                        <Tool 
                                        key={operation.id}
                                        operation={operation} 
                                        selectedBlock={selectedBlock} 
                                        selectedBlockIds={selectedBlockIds}
                                        handleOperationClick={(op) => {
                                            handleOperationClick(op);
                                            setShowOverflow(false);
                                        }}
                                        />
                                    ))}
                                    
                                    </div>
                                    {index !== overflowOps.length - 1 && <hr className='text-secondary' />}
                                </div>
                                ))}
                                <span className="absolute bottom-0 right-0 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-gray-700" />

                            </div>
                            )}
                        </div>
                        )}
                    </div>
                </div>
            </div>
            {showOverflow && (
                <div 
                className='fixed inset-0 z-30' 
                onClick={() => setShowOverflow(false)}
                />
            )}
            {showCropOverlay && selectedBlock?.type === 'image' && (
                <CropOverlay
                    block={selectedBlock as ImageBlockType}
                    onApply={handleCropApply}
                    onCancel={handleCropCancel}
                />
            )}
        </>
    )
}