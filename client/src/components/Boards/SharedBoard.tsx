// components/SharedBoard.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/utils/api';
import type { Board, Block } from '@/types/types';
import ReadOnlyBlock from '../Blocks/ReadOnlyBlock';
import { ZoomIn, ZoomOut, Maximize2, ArrowLeft } from 'lucide-react';
import Header from './Header';

export default function SharedBoard() {
    const { token } = useParams<{ token: string }>();

    //Board state
    const [rootBoard, setRootBoard] = useState<Board | null>(null);
    const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [boardHistory, setBoardHistory] = useState<Board[]>([]);

    const [board, setBoard] = useState<Board | null>(null);

    //UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({x:0, y:0});
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadSharedBoard = async () => {
            if (!token) return;

            setLoading(true);
            
            const boardResult = await api.fetchSharedBoard(token);
            if (!boardResult.success || !boardResult.data) {
                setError('Board not found or link is invalid');
                setLoading(false);
                return;
            }

            const board = boardResult.data.board;
            setRootBoard(board);
            setCurrentBoard(board);

            //fetch blocks for root board
            const blocksResult = await api.fetchSharedBoardBlocks(token, board.id);
        
            if (blocksResult.success && blocksResult.data) {
                setBlocks(blocksResult.data.blocks);
            }
            
            setLoading(false);
        };

        loadSharedBoard();
    }, [token]);

    //Navigate into nested board
    const navigateToBoard = async(linkedBoardId: string) => {
        if(!token || !currentBoard) return;

        setLoading(true);

        //Fetch nested board info
        const boardResult = await api.fetchSharedNestedBoard(token, linkedBoardId);
        if(!boardResult.success || !boardResult.data){
            console.error("Failed to load nested board");
            setLoading(false);
            return;
        }

        //Fetch blocks for nested board
        const blocksResult= await api.fetchSharedBoardBlocks(token, linkedBoardId);

        //Push current board to history
        setBoardHistory(prev => [...prev, currentBoard]);

        //Update state
        setCurrentBoard(boardResult.data.board);
        setBlocks(blocksResult.success && blocksResult.data ? blocksResult.data.blocks: []);

        //Reset view
        setPan({ x: 0, y: 0 });
        setScale(1);
        
        setLoading(false);
    }

    //Navigate back to parent board
    const navigateBack = async() => {
        if(!token || boardHistory.length === 0) return;

        setLoading(true);

        const previousBoard = boardHistory[boardHistory.length - 1];
        setBoardHistory(prev => prev.slice(0, -1));
        
        const blocksResult = await api.fetchSharedBoardBlocks(token, previousBoard.id);
        
        setCurrentBoard(previousBoard);
        setBlocks(blocksResult.success && blocksResult.data ? blocksResult.data.blocks : []);
        
        setPan({ x: 0, y: 0 });
        setScale(1);
        
        setLoading(false);

    }
    //Zoom handlers

    const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 3));
    const handleZoomOut = () => setScale(s => Math.max(s * 0.8, 0.3));
    const handleResetZoom = () => setScale(1);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.95 : 1.05;
            setScale(s => Math.min(Math.max(0.3, s * delta), 3));
        } else {
            setPan(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    //Loading state
    if(loading){
        return(
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <p>Loading...</p>
            </div>
        )
    }

    // Error state
    if (error || !currentBoard) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="text-center">
                    <p className="text-xl mb-2">Board not found</p>
                    <p className="text-sm text-gray-500">This link may be invalid or expired</p>
                </div>
            </div>
        );
    }

    if (blocks.length === 0) {
    return (
        <div className="fixed inset-0 flex flex-col bg-black">
            {/* Read-only banner */}
            <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm">
                📖 Viewing in read-only mode
            </div>

            {/* Header - same as main return */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {boardHistory.length > 0 && (
                        <button 
                            onClick={navigateBack}
                            className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}
                    <div className="flex items-center gap-2 text-white">
                        {boardHistory.length > 0 && (
                            <span className="text-gray-500 text-sm">
                                {rootBoard?.title} {boardHistory.length > 1 && '› ...'} ›
                            </span>
                        )}
                        <h1 className="text-xl font-bold">{currentBoard.title}</h1>
                    </div>
                </div>
            </div>

                {/* Empty state */}
                <div className="flex-1 flex items-center justify-center text-white">
                    <p>This board is empty</p>
                </div>
            </div>
        );
    }
    const sortedBlocks = [...blocks].sort((a, b) => a.location.zIndex - b.location.zIndex);
return (
        <div className="fixed inset-0 flex flex-col bg-black">
            {/* Read-only banner */}
            <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm">
                📖 Viewing in read-only mode
            </div>

            {/* Header with back button and zoom controls */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {/* Back button */}
                    {boardHistory.length > 0 && (
                        <button 
                            onClick={navigateBack}
                            className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}
                    
                    {/* Breadcrumb / Title */}
                    <div className="flex items-center gap-2 text-white">
                        {boardHistory.length > 0 && (
                            <span className="text-gray-500 text-sm">
                                {rootBoard?.title} {boardHistory.length > 1 && '› ...'} ›
                            </span>
                        )}
                        <h1 className="text-xl font-bold">{currentBoard.title}</h1>
                    </div>
                </div>
                
                {/* Zoom controls */}
                <div className="flex gap-2 items-center">
                    <button onClick={handleZoomOut} className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600">
                        <ZoomOut size={16} />
                    </button>
                    <span className="px-3 py-1 bg-gray-700 text-white rounded min-w-[60px] text-center">
                        {(scale * 100).toFixed(0)}%
                    </span>
                    <button onClick={handleZoomIn} className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600">
                        <ZoomIn size={16} />
                    </button>
                    <button onClick={handleResetZoom} className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600">
                        <Maximize2 size={16} />
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div 
                ref={containerRef}
                className="flex-1 relative overflow-hidden bg-gray-900"
                onWheel={handleWheel}
            >
                <div
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        position: 'absolute',
                        width: '20000px',
                        height: '20000px',
                    }}
                >
                    {sortedBlocks.map((block) => (
                        <ReadOnlyBlock 
                            key={block.id}
                            node={block}
                            onBoardClick={navigateToBoard}  // THIS IS THE KEY PART
                        />
                    ))}
                </div>
            </div>
        </div>
    );
    // Auto-scroll to center content on load
    // useEffect(() => {
    //     if (!containerRef.current || blocks.length === 0) return;

    //     const container = containerRef.current;
    //     const scrollX = (container.scrollWidth - container.clientWidth) / 2;
    //     const scrollY = (container.scrollHeight - container.clientHeight) / 2;
        
    //     container.scrollLeft = scrollX;
    //     container.scrollTop = scrollY;
    // }, [blocks, scale]);

    // if (loading) {
    //     return (
    //         <div className="flex items-center justify-center h-screen bg-black text-white">
    //             <p>Loading shared board...</p>
    //         </div>
    //     );
    // }

    // if (error || !board) {
    //     return (
    //         <div className="flex items-center justify-center h-screen bg-black text-white">
    //             <div className="text-center">
    //                 <p className="text-xl mb-2">Board not found</p>
    //                 <p className="text-sm text-gray-500">This link may be invalid or expired</p>
    //             </div>
    //         </div>
    //     );
    // }

    // if (blocks.length === 0) {
    //     return (
    //         <div className="fixed inset-0 flex flex-col bg-black">
    //             <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm">
    //                 📖 Viewing in read-only mode
    //             </div>
    //             <div className="p-4 border-b border-gray-700">
    //                 <h1 className="text-xl font-bold text-white">{board.title}</h1>
    //             </div>
    //             <div className="flex-1 flex items-center justify-center text-white">
    //                 <p>This board is empty</p>
    //             </div>
    //         </div>
    //     );
    // }

    // // Calculate bounding box of all blocks
    // const minX = Math.min(...blocks.map(b => b.location.x));
    // const minY = Math.min(...blocks.map(b => b.location.y));
    // const maxX = Math.max(...blocks.map(b => b.location.x + b.location.width));
    // const maxY = Math.max(...blocks.map(b => b.location.y + b.location.height));

    // const contentWidth = maxX - minX;
    // const contentHeight = maxY - minY;

    // // Calculate canvas size: content + padding, but also account for viewport
    // const padding = 200; // More padding for better centering
    // const minCanvasWidth = 1200; // Minimum canvas width
    // const minCanvasHeight = 800; // Minimum canvas height

    // const canvasWidth = Math.max(contentWidth + (padding * 2), minCanvasWidth);
    // const canvasHeight = Math.max(contentHeight + (padding * 2), minCanvasHeight);

    // // Center content within canvas
    // const offsetX = (canvasWidth - contentWidth) / 2;
    // const offsetY = (canvasHeight - contentHeight) / 2;

    // const sortedBlocks = [...blocks].sort((a, b) => a.location.zIndex - b.location.zIndex);

    // // Adjust block positions to be centered in canvas
    // const adjustedBlocks = sortedBlocks.map(block => ({
    //     ...block,
    //     location: {
    //         ...block.location,
    //         x: block.location.x - minX + offsetX,
    //         y: block.location.y - minY + offsetY
    //     }
    // }));


    // return (
    //     <div className="fixed inset-0 flex flex-col bg-black">
    //         {/* Read-only banner */}
    //         <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm">
    //             📖 Viewing in read-only mode
    //         </div>

    //         {/* Header with zoom controls */}
    //         <div className="p-4 border-b border-gray-700 flex justify-between items-center">
    //             <h1 className="text-xl font-bold text-white">{board.title}</h1>
                
    //             {/* Zoom controls */}
    //             <div className="flex gap-2 items-center">
    //                 <button 
    //                     onClick={handleZoomOut}
    //                     className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
    //                 >
    //                     <ZoomOut size={16} />
    //                 </button>
    //                 <span className="px-3 py-1 bg-gray-700 text-white rounded min-w-[60px] text-center">
    //                     {(scale * 100).toFixed(0)}%
    //                 </span>
    //                 <button 
    //                     onClick={handleZoomIn}
    //                     className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
    //                 >
    //                     <ZoomIn size={16} />
    //                 </button>
    //                 <button 
    //                     onClick={handleResetZoom}
    //                     className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
    //                 >
    //                     <Maximize2 size={16} />
    //                 </button>
    //             </div>
    //         </div>

    //         {/* Scrollable container */}
    //         <div 
    //             ref={containerRef}
    //             className="flex-1 relative overflow-auto bg-gray-900"
    //             onWheel={handleWheel}
    //         >
    //             {/* Canvas with scaled content */}
    //             <div 
    //                 style={{
    //                     width: `${canvasWidth * scale}px`,
    //                     height: `${canvasHeight * scale}px`,
    //                     position: "relative",
    //                 }}
    //             >
    //                 <div
    //                     style={{
    //                         width: `${canvasWidth}px`,
    //                         height: `${canvasHeight}px`,
    //                         transform: `scale(${scale})`,
    //                         transformOrigin: "top left",
    //                         position: "absolute",
    //                         top: 0,
    //                         left: 0,
    //                     }}
    //                 >
    //                     {adjustedBlocks.map((block) => (
    //                         <ReadOnlyBlock 
    //                             key={block.id}
    //                             node={block}
    //                         />
    //                     ))}
    //                 </div>
    //             </div>
    //         </div>
    //     </div>
    // );
}