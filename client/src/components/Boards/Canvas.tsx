// Complete fixed Canvas.tsx
import type {Block, ImageBlockType} from "@/types/types.ts";
import {useState, useRef, useEffect, useMemo} from 'react';
import { useData } from "@/context/data.tsx";
import { useAuth } from "@/context/auth.tsx";
import { useTheme } from "@/context/theme.tsx";
import {generateScheme} from "@/utils/theme.tsx"
import MoveBlocksModal from "@/components/General/Confirmation.tsxx";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Components 
import Context from "./Context.tsx";
import ThemeModal from "./ThemeModal.tsx";
import ResizeableContainer from "./ResizeableContainer.tsx"
import Toolbar from "./Toolbar/Toolbar.tsx";
import SelectionBox from "./SelectionBox.tsx";
import ShareModal from "./ShareModal.tsx";

// HOOKS 
import { uploadToFirebase } from "@/hooks/uploadToFirebase.ts";
import { useEditor } from "@/context/editor.tsx";
import {zoomToBlock} from "@/hooks/blocks/imageHooks.ts"
import { useSidebar } from "@/context/sidebar.tsx";
import Header from "./Header.tsx";
import HelpModal from "./HelpModal.tsx";
import { KeyboardShortcuts } from "@/hooks/keyboardHooks.ts";

import type {GroupMoveState} from "@/hooks/canvasHooks.ts";
import { checkBoardBlockIntersection } from "@/hooks/canvasHooks.ts";

export default function Canvas(){
    const {hasPendingChanges, pushBlocksToBoard, syncNow, blocks, addBlock, updateBoard, currentBoard, batchUpdateBlocks, getParent, checkedHelp, updateCheckedHelp} = useData();
    const {open, toggleOpen, }  = useSidebar()
    
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
        
    if (!currentBoard) return <p>Loading...</p>;

    // Drag and Drop stuff 
    const [dropTargetBoardBlockId, setDropTargetBoardBlockId] = useState<string | null>(null);
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [pendingMove, setPendingMove] = useState<{
        blockIds: string[];
        targetBoardBlockId: string;
        targetBoardTitle: string;
    } | null>(null);

    // Modal Stuff 
    const [title, setTitle] = useState<string>(currentBoard.title);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [themeColor, setThemeColor] = useState(currentBoard.colorscheme.highlight);
    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{x: number, y:number, canvasX:number, canvasY: number} | null>(null);

    const {updateTheme} = useTheme();
    
    const sortedBlocks = useMemo(() => {
        return [...blocks].sort((a, b) => a.location.zIndex - b.location.zIndex);
    }, [blocks]);

    useEffect(()=>{
        setHelpModalOpen(!checkedHelp)
    }, [checkedHelp])

    // Keep title in sync when switching boards
    useEffect(() => {
        setTitle(currentBoard.title);
    }, [currentBoard.id]);

    // Center on blocks when loading board
    useEffect(() => {
        if (!currentBoard) return;
        if (blocks.length === 0) return;
        if (hasCenteredRef.current === currentBoard.id) return;

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            hasCenteredRef.current = currentBoard.id;
            centerOnBlocks(blocks);
        }, 100);

        return () => clearTimeout(timer);
    }, [blocks.length, currentBoard?.id]);
    
    useEffect(()=>{
        checkBoardBlockIntersection({selectedBlockIds, groupMoveState, setDropTargetBoardBlockId, blocks})
    }, [groupMoveState, selectedBlockIds, blocks])

    function centerOnBlocks(blocks: Block[]) {
        const canvas = canvasRef.current;
        if (!canvas || blocks.length === 0) return;

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

    useEffect(() => {
        updateTheme(currentBoard.colorscheme);
    }, [currentBoard.id]);

    // FIXED: screenToCanvas helper function
    const screenToCanvas = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        
        return {
            x: (mouseX - pan.x) / scale,
            y: (mouseY - pan.y) / scale
        };
    };

    const handleGroupMove = (offsetX: number, offsetY: number, isMoving: boolean) => {
        setGroupMoveState({
            isActive: isMoving,
            offsetX,
            offsetY
        });
    };

    // Theme modal handlers
    const onClose = () => setThemeModalOpen(false);
    
    const onSave = async (color:string) => {
        const theme = generateScheme(color);
        await updateBoard(currentBoard.id, { colorscheme: theme});
        updateTheme(theme);
        setThemeModalOpen(false);
    }

    const onChange = (color:string) => setThemeColor(color);

    // Image paste handler
    const handleImagePaste = async (file: File, x: number, y: number) => {
        const token = await getIdToken();
        if (token == null) return;

        const firebaseUrl = await uploadToFirebase({file, token});
        if (!firebaseUrl) return;

        const img = new Image();
        const dimensions: { width: number; height: number } = await new Promise((resolve, reject) => {
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = reject;
            img.src = firebaseUrl;
        });

        const maxZ = Math.max(...blocks.map(b => b.location.zIndex), 0);

        const imageBlock: Partial<ImageBlockType> = {
            type: 'image' as const,
            boardId: currentBoard.id,
            content: {
                title: "Untitled",
                url: firebaseUrl,
                source: 'external',
                imgWidth: dimensions.width,
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
    };


   
    // Drag and drop for images
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const canvasX = (mouseX - pan.x) / scale;
        const canvasY = (mouseY - pan.y) / scale;

        for (const file of imageFiles) {
            await handleImagePaste(file, canvasX, canvasY);
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Title autosave
    useEffect(() => {
        const timer = setTimeout(() => {
            if (title !== currentBoard.title) {
                updateBoard(currentBoard.id, { title });
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

    // Prevent data loss on exit
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasPendingChanges) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasPendingChanges]);

    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden' && hasPendingChanges) {
                await syncNow();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [hasPendingChanges, syncNow]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handler = (e: WheelEvent) => {
            e.preventDefault(); // block native zoom/pinch
        };

        canvas.addEventListener("wheel", handler, { passive: false });

        return () => canvas.removeEventListener("wheel", handler);
    }, []);

    // FIXED: Zoom with wheel - prevent touchpad pinch
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault(); // ALWAYS block browser behavior

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const isZoomGesture = e.ctrlKey; // pinch on Mac, ctrl+wheel on Windows
        const zoomIntensity = 0.01;

        if (isZoomGesture) {
            // ----- ZOOM -----
            const pointX = (mouseX - pan.x) / scale;
            const pointY = (mouseY - pan.y) / scale;

            const zoom = 1 - e.deltaY * zoomIntensity;
            const newScale = Math.min(Math.max(0.1, scale * zoom), 5);

            const newPanX = mouseX - pointX * newScale;
            const newPanY = mouseY - pointY * newScale;

            setScale(newScale);
            setPan({ x: newPanX, y: newPanY });
        } else {
            // ----- PAN -----
            setPan(prev => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY
            }));
        }
        };

    // FIXED: Mouse down with correct coordinates
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (spacePressed && e.button === 0)) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }


        if (e.button === 0 && !spacePressed && !isPanning) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            
            setIsSelecting(true);
            setSelectionBox({
                startX: canvasCoords.x, 
                startY: canvasCoords.y,
                endX: canvasCoords.x, 
                endY: canvasCoords.y
            });
        }
    };

    // FIXED: Mouse move with correct coordinates
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
        }
        
        if (isSelecting && selectionBox) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            
            setSelectionBox((prev) => {
                if (!prev) return null;
                return { ...prev, endX: canvasCoords.x, endY: canvasCoords.y };
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);

        if (isSelecting) {
            setSelectionBox(null);
            setIsSelecting(false);     
            if (selectedBlockIds.length > 0) setIsSelected(true); 
            else setIsSelected(false);  
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            setIsSelecting(true);
            setSelectionBox({
                startX: canvasCoords.x, 
                startY: canvasCoords.y,
                endX: canvasCoords.x, 
                endY: canvasCoords.y
            });
        setContextMenu({ x: e.clientX, y: e.clientY, canvasX: canvasCoords.x, canvasY:canvasCoords.y });
    }

    // Export PDF
    const getContentBounds = () => {
        if (blocks.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for(const block of blocks){
            const {x, y, width, height} = block.location;
            minX = Math.min(x, minX);
            minY = Math.min(y, minY);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        }

        const padding = 50;
        return {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2
        };
    };

    const handleExportPDF = async () => {
        const bounds = getContentBounds();
        if (!bounds) return;

        const prevScale = scale;
        const prevPan = {...pan};

        setScale(1);
        setPan({x: -bounds.x, y: -bounds.y});

        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
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
        } finally {
            setScale(prevScale);
            setPan(prevPan);
        }
    };

    // Z-index handling
    const bringToFront = async (ids: string[]) => {
        if (!ids.length) return;

        const idSet = new Set(ids);
        const sorted = [...blocks].sort((a, b) => a.location.zIndex - b.location.zIndex);
        const moving = sorted.filter(b => idSet.has(b.id));
        const others = sorted.filter(b => !idSet.has(b.id));

        if (!moving.length) return;

        const updated: Record<string, Partial<Block>> = {};
        let z = 0;

        for (const block of others) {
            updated[block.id] = {
                location: { ...block.location, zIndex: z++ }
            };
        }

        for (const block of moving) {
            updated[block.id] = {
                location: { ...block.location, zIndex: z++ }
            };
        }

        await batchUpdateBlocks(updated);
    };

    const pushToBack = async (ids: string[]) => {
        if (!ids.length) return;

        const idSet = new Set(ids);
        const sorted = [...blocks].sort((a, b) => a.location.zIndex - b.location.zIndex);
        const moving = sorted.filter(b => idSet.has(b.id));
        const others = sorted.filter(b => !idSet.has(b.id));

        if (!moving.length) return;

        const updated: Record<string, Partial<Block>> = {};
        let z = 0;

        for (const block of moving) {
            updated[block.id] = {
                location: { ...block.location, zIndex: z++ }
            };
        }

        for (const block of others) {
            updated[block.id] = {
                location: { ...block.location, zIndex: z++ }
            };
        }

        await batchUpdateBlocks(updated);
        setContextMenu(null);
        clearSelection();
    };

    const handleBlockSelect = (block: Block | null) => {
        if (!isPanning && !spacePressed && !isSelecting) {
            if (block == null) {
                clearSelection(); 
                setIsSelected(false);
            } else if (!selectedBlockIds.includes(block.id)) {
                toggleSelection(block.id);
            }
            
            if (block && block.type !== "text") {
                setIsEditingText(false);
                setEditingBlockId(null);
            }
        }
    }

    const handleZoomToBlock = (block: Block | null) => {
        if (block == null) return;
        if (!isPanning && !spacePressed) {
            zoomToBlock(canvasRef, block, setScale, setPan);
        }
    }

    return (
        <>
            <div className="fixed inset-0 flex flex-col">        
                <div className={`${open ? "" : "hidden"}`}>
                    <Header 
                        parent={getParent(currentBoard.id)} 
                        title={title} 
                        scale={scale} 
                        setPan={setPan} 
                        setTitle={setTitle} 
                        setScale={setScale} 
                        setThemeModalOpen={setThemeModalOpen} 
                        setShareModalOpen={setShareModalOpen} 
                        setHelpModalOpen={setHelpModalOpen} 
                        handleExportPDF={handleExportPDF}
                    />
                </div>    

                {/* Canvas */}
                <div className="flex-1 relative overflow-hidden">
                    <div
                        ref={canvasRef}
                        className={`absolute inset-0 overflow-hidden ${
                            isPanning || spacePressed ? 'cursor-grab' : ''
                        } ${isPanning ? 'cursor-grabbing' : ''}`}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onClick={() => {
                            if (!isSelected) {
                                handleBlockSelect(null);
                                setContextMenu(null);
                            }
                        }}
                        onContextMenu={handleContextMenu}
                        onDrop={handleDrop}         
                        onDragOver={handleDragOver}
                    >
                        {/* FIXED: Transform container size */}
                        <div
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                                transformOrigin: "0 0",
                                position: "absolute",
                                width: "20000px",   // Fixed from 4000px
                                height: "20000px",  // Fixed from 4000px
                            }}
                        >
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
                                        shouldResize={(!isPanning && !spacePressed)}
                                        groupMoveState={groupMoveState}
                                        onGroupMove={handleGroupMove}
                                    />
                                ))}
                            </div> 

                            <SelectionBox 
                                selectionBox={selectionBox}
                                scale={scale}
                                groupMoveState={groupMoveState}
                            />
                        </div>
                    </div>
                </div>

                {contextMenu && 
                    <Context 
                        x={contextMenu.x} 
                        y={contextMenu.y} 
                        canvasX={contextMenu.canvasX} 
                        canvasY={contextMenu.canvasY} 
                        selected={selectedBlockIds} 
                        parentId={currentBoard.id} 
                        setContextMenu={setContextMenu}
                        bringToFront={bringToFront}
                        pushToBack={pushToBack}
                    />
                }
                {canvasRef.current && <KeyboardShortcuts onToggleSidebar={() => toggleOpen()} pan={pan} scale={scale} canvasRef={canvasRef as React.RefObject<HTMLDivElement>} />}
                <Toolbar />
            </div>

            <ThemeModal 
                open={themeModalOpen} 
                baseColor={themeColor} 
                onClose={onClose} 
                onSave={onSave} 
                onChange={onChange}
            />
            <ShareModal 
                open={shareModalOpen} 
                boardId={currentBoard.id} 
                onClose={() => setShareModalOpen(false)} 
            />
            <HelpModal 
                open={helpModalOpen} 
                onClose={async () => {
                    setHelpModalOpen(false);
                    await updateCheckedHelp(true);
                }} 
            />
        </>
    );
}