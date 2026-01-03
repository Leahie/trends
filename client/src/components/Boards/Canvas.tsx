import type {Block} from "@/types";
import {useState, useRef, useEffect, useMemo} from 'react';
import { useData } from "@/context/data.tsx";
import { useTheme } from "@/context/theme.tsx";
import {generateScheme} from "@/utils/theme.tsx"

import Context from "./Context.tsx";
import ThemeModal from "./ThemeModal.tsx";
import ResizeableContainer from "./ResizeableContainer.tsx"


export default function Canvas(){
    const {blocks, updateBlock, updateBoard, currentBoard, batchUpdateBlocks} = useData();

    if (!currentBoard) return <p>Loading...</p>;
    console.log(currentBoard)
    console.log(blocks)
    const [title, setTitle] = useState<string>(currentBoard.title);
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [themeColor, setThemeColor] = useState(currentBoard.colorscheme.highlight);
    const {updateTheme} = useTheme();
    // temp 
    const sortedBlocks = useMemo(() => {
        return [...blocks].sort(
            (a, b) => a.location.zIndex - b.location.zIndex
        );
    }, [blocks]);

    useEffect(() =>{
        updateTheme(currentBoard.colorscheme);
    }, [])

    // Right-click logic
    const [contextMenu, setContextMenu] = useState<{x: number, y:number, canvasX:number, canvasY: number} | null>(null);
    
    // Block logic
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);


    // THeme logic
    
    console.log("This is the selected block id", selectedBlockId);

    const onClose = () => {
        setThemeModalOpen(false);
    }

    const onSave = async (color:string) => {
        const theme = generateScheme(color);
        await updateBoard(currentBoard.id, { ...currentBoard, colorscheme: theme});
        updateTheme(theme);
        setThemeModalOpen(false);
    }

    const onChange = (color:string) =>{
        setThemeColor(color);
    }

    // Zoom and pan state
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [spacePressed, setSpacePressed] = useState(false);
    
    const canvasRef = useRef<HTMLDivElement>(null);
    
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
            if (e.code === 'Space' && !spacePressed) {
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
    }, [spacePressed]);

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
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;


        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const canvasX = (mouseX - pan.x) ;
        const canvasY = (mouseY - pan.y);

        setContextMenu({ x: mouseX, y: mouseY, canvasX, canvasY });

    }

    // Z INDEX HANDLING 
    const bringToFront = async(id: string) => {
        console.log("bring to front called")
        const block = blocks.find(b => b.id === id);
        if (!block) return;

        const maxZ = Math.max(...blocks.map(b => b.location.zIndex), 0);


        const sorted = [...blocks].sort(
            (a, b) => a.location.zIndex - b.location.zIndex
        );

        const others = sorted.filter(b => b.id !== id);
        const one = sorted.find(b => b.id === id);

        if (!one){ 
            console.log("bring to front stop 2")
            return;
}
        const updated: Record<string, Partial<Block>> = {};

        others.forEach((block, index) => {
        updated[block.id] = {
            location: {
            ...block.location,
            zIndex: index + 1,
            },
        };
        });

        updated[id] = {
        location: {
            ...one.location,
            zIndex: others.length + 2,
        },
        };

        console.log("updated z index locations", updated);
        await batchUpdateBlocks(updated);
    }

    // useEffect(() =>{
    //     if (selectedBlockId!=null) bringToFront(selectedBlockId)
    // }, [selectedBlockId])

    return (
    
    <>
    <div className="fixed inset-0 flex flex-col" >        
        <div className="">
            <div className="absolute top-9 right-4 z-50 flex gap-2">
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
            </div>
        </div>    

        {/* Canvas - this is the infinite canvas area */}
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
                onClick={() => {setSelectedBlockId(null); setContextMenu(null)}}
                onContextMenu={handleContextMenu}
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
                                selected={selectedBlockId === block.id} 
                                onSelected={() => setSelectedBlockId(block.id)}
                                bringToFront={bringToFront}
                            />
                        ))}
                    </div> 
                </div>
            </div>
        </div>
        { contextMenu && 
            <Context 
                x={contextMenu.x} 
                y={contextMenu.y} 
                canvasX={contextMenu.canvasX} 
                canvasY={contextMenu.canvasY} 
                selected={selectedBlockId} 
                parentId={currentBoard.id} 
                setContextMenu={setContextMenu}
            />
        }
    </div>
    <ThemeModal open={themeModalOpen} baseColor = {themeColor} onClose={onClose} onSave = {onSave} onChange={onChange}/>
    </>
)
}