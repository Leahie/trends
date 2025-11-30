import type {Block, BasePageBlockType, DiaryBlockType, BlockSizeType} from "../types";
import ResizeableContainer from "./ResizeableContainer.tsx"
import {useState, useRef, useEffect} from 'react';
import { useData } from "../context/data.tsx";
import { useTheme } from "../context/theme.tsx";
import {generateScheme} from "../utils/theme.tsx"

import Context from "./Context.tsx";
import ThemeModal from "./ThemeModal.tsx";

export default function Canvas({node}: {node : BasePageBlockType | DiaryBlockType}){
    if (!node) return null;

    const {dataMap, locations, setLocations, updateBlock} = useData();
    const [title, setTitle] = useState<string>(node.properties.title);
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [themeColor, setThemeColor] = useState(node.properties.colorscheme.highlight);
    const {updateTheme} = useTheme();
    // temp 

    useEffect(() =>{
        updateTheme(node.properties.colorscheme);
    }, [])

    // Right-click logic
    const [contextMenu, setContextMenu] = useState<{x: number, y:number, canvasX:number, canvasY: number} | null>(null);
    
    // Block logic
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);


    // THeme logic
    

    const onClose = () => {
        setThemeModalOpen(false);
    }

    const onSave = async (color:string) => {
        const theme = generateScheme(color);
        await updateBlock(node.id, {properties: {...node.properties, colorscheme: theme}});
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
            if (title !== node.properties.title) {
                updateBlock(node.id, {
                    properties: {
                        ...node.properties,
                        title
                    }
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [title, node.id]);


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
    const bringToFront = (id: string) => {
        const entries = Object.entries(locations);
        entries.sort((a, b) => a[1].zIndex - b[1].zIndex)

        const others = entries.filter(entry => entry[0] != id);
        const one = entries.find((entry) => entry[0] == id);

        if (!one){ 
            return; }

        const updated:Record<string, BlockSizeType> = {};
        others.forEach((elem, ind) => 
            updated[elem[0]] = {...elem[1], zIndex: ind + 1}
        )

        updated[id] = {...one[1], zIndex: others.length+1}

        setLocations(updated);

    }

    useEffect(() =>{
        if (selectedBlockId!=null) bringToFront(selectedBlockId)
    }, [selectedBlockId])

    return !node ? (
    <p>Loading...</p>
) : (
    
    <>
    <div className="fixed inset-0 flex flex-col" >        
        <div className="">
            <div className="absolute top-9 right-4 z-50 flex gap-2">
                <input 
                    type="text"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className = "px-3 py-1 bg-highlight text-white rounded hover:bg-dark outline-none"
                />      
                <button 
                    onClick={() => setScale(s => Math.max(s * 0.8, 0.1))} 
                    className="px-3 py-1 bg-highlight text-white rounded hover:bg-dark"
                >
                    −
                </button>
                <span className="px-3 py-1 bg-highlight text-white rounded">
                    {(scale * 100).toFixed(0)}%
                </span>
                <button 
                    onClick={() => setScale(s => Math.min(s * 1.2, 5))} 
                    className="px-3 py-1 bg-highlight text-white rounded hover:bg-dark"
                >
                    +
                </button>
                <button 
                    onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} 
                    className="px-3 py-1 bg-highlight text-white rounded hover:bg-dark"
                >
                    Reset
                </button>
                <button 
                    onClick={() => { setThemeModalOpen(true) }} 
                    className="px-3 py-1 bg-highlight text-white rounded hover:bg-dark"
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
                        {node.content.map((e: string) => (
                            <ResizeableContainer 
                                key={e}
                                node={dataMap[e]} 
                                blockLocation={locations[e]} 
                                scale={scale}
                                selected={selectedBlockId === e} 
                                onSelected={() => setSelectedBlockId(e)
                                
                                }
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
                parentId={node.id} 
                setContextMenu={setContextMenu}
            />
        }
    </div>
    <ThemeModal open={themeModalOpen} baseColor = {themeColor} onClose={onClose} onSave = {onSave} onChange={onChange}/>
    </>
)
}