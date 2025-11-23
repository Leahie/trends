import type {Block, BasePageBlockType, BlockSizeType} from "../types";
import ResizeableContainer from "./ResizeableContainer.tsx"
import rawBlockStates from "../data/block_states.json"
import {useState, useRef, useEffect} from 'react';

export default function({node, dataMap}: {node: BasePageBlockType, dataMap: Record<string, Block>}){
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const blockStates = rawBlockStates as Record<string, BlockSizeType>;
    // Zoom and pan state
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [spacePressed, setSpacePressed] = useState(false);
    
    const canvasRef = useRef<HTMLDivElement>(null);

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
    return(
        
        <div className="fixed inset-0 flex flex-col">        
            <div className="">
                <div className="absolute top-9 right-4 z-50 flex gap-2">
                    <button 
                        onClick={() => setScale(s => Math.max(s * 0.8, 0.1))} 
                        className="px-3 py-1 bg-[#3C423F] text-white rounded hover:bg-gray-600"
                    >
                        −
                    </button>
                    <span className="px-3 py-1 bg-[#3C423F] text-white rounded">
                        {(scale * 100).toFixed(0)}%
                    </span>
                    <button 
                        onClick={() => setScale(s => Math.min(s * 1.2, 5))} 
                        className="px-3 py-1 bg-[#3C423F] text-white rounded hover:bg-gray-600"
                    >
                        +
                    </button>
                    <button 
                        onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} 
                        className="px-3 py-1 bg-[#3C423F] text-white rounded hover:bg-gray-600"
                    >
                        Reset
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
                    onClick={() => setSelectedBlockId(null)}
                >
                    {/* Transform container - this gets scaled and panned */}
                    <div
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                            transformOrigin: '0 0',
                            position: 'absolute',
                            // Don't set width/height to 100% - let it be as big as needed
                            pointerEvents: 'none', // Prevent this div from blocking clicks
                        }}
                    >
                        {/* Re-enable pointer events for actual content */}
                        <div style={{ pointerEvents: 'auto' }}>
                            {node.content.map((e: string) => (
                                <ResizeableContainer 
                                    key={e}
                                    node={dataMap[e]} 
                                    blockLocation={blockStates[e]} 
                                    selected={selectedBlockId === e} 
                                    onSelected={() => setSelectedBlockId(e)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
        
    )
}