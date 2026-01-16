import type {Block, ImageBlockType} from "@/types/types.ts";
import {useState, useRef, useEffect, useMemo} from 'react';
import { useData } from "@/context/data.tsx";
import { useAuth } from "@/context/auth.tsx";
import { useTheme } from "@/context/theme.tsx";
import {generateScheme} from "@/utils/theme.tsx"
import { Download, Share } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Components 
import Context from "./Context.tsx";
import ThemeModal from "./ThemeModal.tsx";
import ResizeableContainer from "./ResizeableContainer.tsx"
import Toolbar from "./Toolbar/Toolbar.tsx";
import SelectionBox from "./SelectionBox.tsx";
import GroupResizeWrapper from "./GroupResizeWrapper.tsx";
import ShareModal from "./ShareModal.tsx";


// HOOKS 
import { useImagePaste } from "@/hooks/useImagePaste.ts";
import { uploadToFirebase } from "@/hooks/uploadToFirebase.ts";
import { useEditor } from "@/context/editor.tsx";
import {zoomToBlock} from "@/hooks/blocks/imageHooks.ts"

interface GroupMoveState {
    isActive: boolean;
    offsetX: number;
    offsetY: number;
}

export default function Canvas(){
    const {blocks, addBlock, updateBoard, isSyncing, currentBoard, batchUpdateBlocks} = useData();
    const hasCenteredRef = useRef<string | null>(null);

    const {getIdToken} = useAuth()
    const {toggleSelection, clearSelection, selectedBlockIds, isEditingText, setIsEditingText, setEditingBlockId} = useEditor();
    // Zoom and pan state
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [spacePressed, setSpacePressed] = useState(false);
    // Selection Box 
    const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, 
                                                        endX: number, endY: number
                                                        } | null>(null);

    const [isSelecting, setIsSelecting] = useState(false);
    const [isSelected, setIsSelected] = useState(false);

    const [groupMoveState, setGroupMoveState] = useState<GroupMoveState>({
        isActive: false,
        offsetX: 0,
        offsetY: 0
    });

    const canvasRef = useRef<HTMLDivElement>(null);
    if (!currentBoard){  return <p>Loading...</p>};
    console.log("the current board", currentBoard)
    console.log(blocks)


    const [title, setTitle] = useState<string>(currentBoard.title);
    // Keep local title in sync when switching boards to avoid overwriting
    // the newly-opened board with a stale title from the previous board.

    //share modal
    const [shareModalOpen, setShareModalOpen] = useState(false);
    useEffect(() => {
        setTitle(currentBoard.title);
    }, [currentBoard.id]);
    
    
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [themeColor, setThemeColor] = useState(currentBoard.colorscheme.highlight);
    const {updateTheme} = useTheme();
    // temp 
    const sortedBlocks = useMemo(() => {
        return [...blocks].sort(
            (a, b) => a.location.zIndex - b.location.zIndex
        );
        
    }, [blocks]);
    
    useEffect(() => {
        if (!currentBoard) return;
        if (blocks.length === 0) return;
        if (hasCenteredRef.current === currentBoard.id) return;

        hasCenteredRef.current = currentBoard.id;

        centerOnBlocks(blocks);
    }, [blocks, currentBoard?.id]);
    
    function centerOnBlocks(blocks: Block[]) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        let sumX = 0, sumY = 0;

        for (const b of blocks) {
            sumX += b.location.x + b.location.width / 2;
            sumY += b.location.y + b.location.height / 2;
        }

        const cx = sumX / blocks.length;
        const cy = sumY / blocks.length;

        setPan({
            x: rect.width / 2 - cx * scale,
            y: rect.height / 2 - cy * scale,
        });
    }

    useEffect(() =>{
        updateTheme(currentBoard.colorscheme);
    }, [currentBoard.id]); //adds currentBoard.id as dependency to update theme when board changes



    // helper function that I should probably use elsewhere
    const screenToCanvas = (xAcc: number, yAcc:number) => {
        return {x: ((xAcc - pan.x) / scale), y: ((yAcc - pan.y) / scale )}
    }


    // Right-click logic
    const [contextMenu, setContextMenu] = useState<{x: number, y:number, canvasX:number, canvasY: number} | null>(null);
    
     const handleGroupMove = (offsetX: number, offsetY: number, isMoving: boolean) => {
        setGroupMoveState({
            isActive: isMoving,
            offsetX,
            offsetY
        });
    };

    // THeme logic
    
    console.log("This is the selected block ids", selectedBlockIds);

    const onClose = () => {
        setThemeModalOpen(false);
    }

    const onSave = async (color:string) => {
        const theme = generateScheme(color);
        await updateBoard(currentBoard.id, { colorscheme: theme});
        updateTheme(theme);
        setThemeModalOpen(false);
    }

    const onChange = (color:string) =>{
        setThemeColor(color);
    }
    
    // IMAGE PASTING 
    const handleImagePaste = async (file: File, x : number, y: number) => {
        
        const token = await getIdToken();

        if (token == null) return;
        // upload to firebase storage 
        const firebaseUrl = await uploadToFirebase({file, token});

        if (!firebaseUrl){
            return;
        }

        const img = new Image();
        const dimensions: { width: number; height: number } = await new Promise((resolve, reject) => {
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = reject;
            img.src = firebaseUrl;
        });

        const maxZ = Math.max(...blocks.map(b => b.location.zIndex), 0);

        const imageBlock:Partial<ImageBlockType> = {
            type: 'image' as const,
            boardId: currentBoard.id,
            content: {
                title: "Untitled",
                url: firebaseUrl,
                source: 'external',
                imgWidth: dimensions.width,   // <-- store original dimensions
                imgHeight: dimensions.height
            },
            location: {
                x,
                y,
                width: dimensions.width,
                height: dimensions.height,
                zIndex: maxZ + 1,
                rotation: 0,
                scaleX: 1,
                scaleY: 1
            }
        };

        await addBlock(imageBlock); 
    }

    useImagePaste({
        onImagePaste: handleImagePaste, 
        canvasRef, 
        scale, 
        pan
    })

    // drag and drop for images
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            console.log('No image files dropped');
            return;
        }

        // Calculate canvas position where image was dropped
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert to canvas coordinates (accounting for pan and scale)
        const canvasX = (mouseX - pan.x) / scale;
        const canvasY = (mouseY - pan.y) / scale;

        // Upload each image (or just the first one)
        for (const file of imageFiles) {
            await handleImagePaste(file, canvasX, canvasY);
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Required to allow drop
        e.stopPropagation();
    };

    // Title 
    useEffect(() => {
        const timer = setTimeout(() => {
            if (title !== currentBoard.title) {
                updateBoard(currentBoard.id, {
                        ...currentBoard,
                        title:title
                    
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [title, currentBoard.id]);


    // Spacebar handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !spacePressed && !isEditingText) {
                e.preventDefault();
                setSpacePressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setSpacePressed(false);
                setIsPanning(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [spacePressed, isEditingText]);

    


    // Zoom with wheel
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const pointX = (mouseX - pan.x) / scale;
        const pointY = (mouseY - pan.y) / scale;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(0.1, scale * delta), 5);

        const newPanX = mouseX - pointX * newScale;
        const newPanY = mouseY - pointY * newScale;

        setScale(newScale);
        setPan({ x: newPanX, y: newPanY });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (spacePressed && e.button === 0)) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }

        if (e.button === 0 && !spacePressed && !isPanning){
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const canvasCoords = screenToCanvas(e.clientX, e.clientY)
            setIsSelecting(true);
            setSelectionBox({
                startX: canvasCoords.x, startY: canvasCoords.y,
                endX: canvasCoords.x, endY: canvasCoords.y
            })

        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
        }
        if (isSelecting && selectionBox){
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const canvasCoords = screenToCanvas(mouseX, mouseY);

            setSelectionBox((prev) => {
                if (!prev) return null;
                return  {...prev, endX:canvasCoords.x, endY: canvasCoords.y, }
            })
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);

        if (isSelecting) {
            setSelectionBox(null);
            setIsSelecting(false);     
            if (selectedBlockIds.length>0) setIsSelected(true); 
            else setIsSelected(false);  
            console.log(isSelected)
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const canvas = canvasRef.current;
        if (!canvas) return;


        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const canvasX = (mouseX - pan.x) ;
        const canvasY = (mouseY - pan.y);

        setContextMenu({ x: mouseX, y: mouseY, canvasX, canvasY });

    }
    // Handles exporting as pdf

    const getContentBounds= () => {
        if (blocks.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for(const block of blocks){
            const{x, y, width, height} = block.location;
            minX = Math.min(x, minX);
            minY = Math.min(y, minY);
            maxX = Math.max(maxX, x+width);
            maxY = Math.max(maxY, y+height);
        }
        // add padding

        const padding = 50
        return{
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding *2,
            height: maxY - minY + padding *2
        }

    };
    const handleExportPDF = async () => {
        const bounds = getContentBounds();
        if(!bounds) return;

        //return current view
        const prevScale = scale;
        const prevPan = {...pan};

        setScale(1);
        setPan({x: -bounds.x, y: -bounds.y});

        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = canvasRef.current;
        if(!canvas) return;

        try{
            const screenshot = await html2canvas(canvas, {
                x: 0,
                y: 0,
                width: bounds.width,
                height: bounds.height,
                backgroundColor: getComputedStyle(document.documentElement)
                .getPropertyValue('--color-dark') || '#1a1a1a',
                useCORS: true,
            allowTaint: false,
            onclone: async (clonedDoc) => {
                // Convert Firebase images to base64 to avoid CORS
                const images = clonedDoc.querySelectorAll('img');
                
                await Promise.all(
                    Array.from(images).map(async (img) => {
                        if (img.src.includes('firebasestorage')) {
                            try {
                                const response = await fetch(img.src, { mode: 'cors' });
                                const blob = await response.blob();
                                const base64 = await new Promise<string>((resolve) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result as string);
                                    reader.readAsDataURL(blob);
                                });
                                img.src = base64;
                            } catch (e) {
                                console.warn('Failed to convert image:', e);
                                // Hide failed images instead of breaking
                                img.style.opacity = '0';
                            }
                        }
                    })
                );
            }
            });

            const imgData = screenshot.toDataURL('image/png');
            const orientation = bounds.width > bounds.height ? 'l': 'p';
            const pdf = new jsPDF(orientation, 'px', [bounds.width, bounds.height]);

            pdf.addImage(imgData, 'PNG', 0, 0, bounds.width, bounds.height);
            pdf.save(`${title || 'board'}.pdf`);
        }finally{
            setScale(prevScale);
            setPan(prevPan)
        }

    // // Create hidden container
    // const container = document.createElement('div');
    // container.style.cssText = `
    //     position: absolute;
    //     left: -99999px;
    //     top: 0;
    //     width: ${bounds.width}px;
    //     height: ${bounds.height}px;
    //     background: var(--color-dark, #1a1a1a);
    //     overflow: hidden;
    // `;
    // document.body.appendChild(container);

    // // Clone each block element into the container
    // for (const block of blocks) {
    //     const el = document.querySelector(`[data-block-id="${block.id}"]`);
    //     if (!el) continue;

    //     const clone = el.cloneNode(true) as HTMLElement;
    //     clone.style.position = 'absolute';
    //     clone.style.left = `${block.location.x - bounds.x}px`;
    //     clone.style.top = `${block.location.y - bounds.y}px`;
    //     clone.style.width = `${block.location.width}px`;
    //     clone.style.height = `${block.location.height}px`;
    //     clone.style.transform = 'none';
    //     container.appendChild(clone);
    // }

    // // Small delay for images to load in cloned elements
    // await new Promise(r => setTimeout(r, 200));

    // try {
    //     const screenshot = await html2canvas(container, {
    //         backgroundColor: '#1a1a1a',
    //         useCORS: true,  // Important for external images
    //         allowTaint: true,
    //     });

    //     const imgData = screenshot.toDataURL('image/png');
    //     const orientation = bounds.width > bounds.height ? 'l' : 'p';
    //     const pdf = new jsPDF(orientation, 'px', [bounds.width, bounds.height]);
    //     pdf.addImage(imgData, 'PNG', 0, 0, bounds.width, bounds.height);
    //     pdf.save(`${title || 'board'}.pdf`);

    // } finally {
    //     document.body.removeChild(container);
    // }
    }
    // Z INDEX HANDLING 
    const bringToFront = async (ids: string[]) => {
        if (!ids.length) return;

        const idSet = new Set(ids);

        const sorted = [...blocks].sort(
            (a, b) => a.location.zIndex - b.location.zIndex
        );

        const moving = sorted.filter(b => idSet.has(b.id));
        const others = sorted.filter(b => !idSet.has(b.id));

        if (!moving.length) return;

        const updated: Record<string, Partial<Block>> = {};
        let z = 0;

        // Others stay first
        for (const block of others) {
            updated[block.id] = {
            location: {
                ...block.location,
                zIndex: z++,
            },
            };
        }

        // Moving group goes on top, preserving internal order
        for (const block of moving) {
            updated[block.id] = {
            location: {
                ...block.location,
                zIndex: z++,
            },
            };
        }

        await batchUpdateBlocks(updated);
    };

    const pushToBack = async (ids: string[]) => {
        if (!ids.length) return;

        const idSet = new Set(ids);

        const sorted = [...blocks].sort(
            (a, b) => a.location.zIndex - b.location.zIndex
        );

        const moving = sorted.filter(b => idSet.has(b.id));
        const others = sorted.filter(b => !idSet.has(b.id));

        if (!moving.length) return;

        const updated: Record<string, Partial<Block>> = {};
        let z = 0;

        // Moving group goes first
        for (const block of moving) {
            updated[block.id] = {
            location: {
                ...block.location,
                zIndex: z++,
            },
            };
        }

        // Others go above them
        for (const block of others) {
            updated[block.id] = {
            location: {
                ...block.location,
                zIndex: z++,
            },
            };
        }

        console.log("updated z index locations", updated);

        await batchUpdateBlocks(updated);
        setContextMenu(null);
        clearSelection();
        };
    // useEffect(() =>{
    //     if (selectedBlockId!=null) bringToFront(selectedBlockId)
    // }, [selectedBlockId])

    
    const handleBlockSelect = (block: Block | null) => {
        if (!isPanning && !spacePressed && !isSelecting){ // don't want this behavior if I'm panning
            
            if (block==null) {clearSelection(); setIsSelected(false)}
            else if(!selectedBlockIds.includes(block.id)) toggleSelection(block.id);
            if (block && block.type !== "text") {
                setIsEditingText(false);
                setEditingBlockId(null);
            }
        }
    }

    const handleZoomToBlock = (block: Block | null) => {
        if (block==null) return;
        if ( !isPanning && !spacePressed){
            zoomToBlock(canvasRef, block, setScale, setPan)
        }
    }


    return (
    
    <>
    <div className="fixed inset-0 flex flex-col" >        
        <div className="">
            <div className="absolute top-9 right-4 z-50 flex gap-2 opacity-30 hover:opacity-100">
                <input 
                    type="text"
                    value={title} 
                    onChange={(e) => {
                        e.stopPropagation();
                        return setTitle(e.target.value)}}
                    placeholder="Title"
                    className = "px-3 py-1 bg-dark text-white rounded hover:bg-dark outline-none"
                />      
                <button 
                    onClick={() => setScale(s => Math.max(s * 0.8, 0.1))} 
                    className="px-3 py-1 bg-dark text-white rounded hover:bg-dark"
                >
                    −
                </button>
                <span className="px-3 py-1 bg-dark text-white rounded">
                    {(scale * 100).toFixed(0)}%
                </span>
                <button 
                    onClick={() => setScale(s => Math.min(s * 1.2, 5))} 
                    className="px-3 py-1 bg-dark text-white rounded hover:bg-dark"
                >
                    +
                </button>
                <button 
                    onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} 
                    className="px-3 py-1 bg-dark text-white rounded hover:bg-dark"
                >
                    Reset
                </button>
                <button 
                    onClick={() => { setThemeModalOpen(true) }} 
                    className="px-3 py-1 bg-dark text-white rounded hover:bg-dark"
                >
                    Theme
                </button>
                <button
                    onClick={() => setShareModalOpen(true)}
                    className="px-3 py-1 bg-dark text-white rounded hover:bg-dark"
                >
                    <Share size={18}/>
                </button>
                <button
                    onClick={handleExportPDF}
                    className="px-3 py-1 bg-dark text-white rounded hover:bg-dark"
                >
                    <Download size={18}/>
                </button>
            </div>
        </div>    

        {/* Canvas - this is the infinite canvas area */}
        <div className="flex-1 relative overflow-hidden">
            <div
                ref={canvasRef}
                className={`absolute inset-0 overflow-hidden ${
                    isPanning || spacePressed ? 'cursor-grab' : ''
                } ${isPanning ? 'cursor-grabbing' : ''} `}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={(e) => {if (!isSelected) {
                                handleBlockSelect(null);
                                setContextMenu(null);
                            }}}
                onContextMenu={handleContextMenu}
                onDrop={handleDrop}         
                onDragOver={handleDragOver}
            >
                {/* Transform container - this gets scaled and panned */}
                <div
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                        transformOrigin: "0 0",
                        position: "absolute",
                        width: "4000px",
                        height: "4000px",
                    }}
                >
                    {/* Re-enable pointer events for actual content */}
                    <div style={{ pointerEvents: 'auto' }}>
                        {sortedBlocks.map((block) => (
                            <ResizeableContainer 
                                key={block.id}
                                node={block} 
                                blockLocation={block.location} 
                                scale={scale}
                                onSelected={() => handleBlockSelect(block)}
                                bringToFront={bringToFront}
                                zoomToBlock={handleZoomToBlock}
                                shouldResize = {(!isPanning && !spacePressed)}
                                groupMoveState={groupMoveState}
                                onGroupMove={handleGroupMove}
                            />
                        ))}
                    </div> 

                    
                    <SelectionBox 
                                selectionBox={selectionBox}
                                scale={scale}
                                pan={pan}
                                groupMoveState={groupMoveState}
                            />
                </div>
            </div>
        </div>
        { contextMenu && 
            <Context 
                x={contextMenu.x} 
                y={contextMenu.y} 
                canvasX={contextMenu.canvasX} 
                canvasY={contextMenu.canvasY} 
                selected={selectedBlockIds} 
                parentId={currentBoard.id} 
                setContextMenu={setContextMenu}
                bringToFront= {bringToFront}
                pushToBack={pushToBack}
            />
        }
        <Toolbar />
    </div>
    <ThemeModal open={themeModalOpen} baseColor = {themeColor} onClose={onClose} onSave = {onSave} onChange={onChange}/>
    <ShareModal 
        open={shareModalOpen} 
        boardId={currentBoard.id} 
        onClose={() => setShareModalOpen(false)} 
    />
    </>
)
}