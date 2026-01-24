// components/SharedBoard.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, } from 'react-router-dom';
import { api } from '@/utils/api';
import type { Board, Block } from '@/types/types';
import ReadOnlyCanvas from './ReadOnlyCanvas';
import type { SharedTreeNode } from '@/utils/misc';
import { buildSharedTree } from '@/utils/misc';
import SharedSidebar from '../Sidebar/ShareableSidebar';

export default function SharedBoard() {
    const { token } = useParams<{ token: string }>();

    
    //Board state
    const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
    const [title, setTitle] = useState<string | null>(null);

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [tree, setTree] = useState<SharedTreeNode | null>(null);


    //UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

            setCurrentBoard(board);
            setTitle(board.title)
            
            const tree = await buildSharedTree(token, board);
            setTree(tree);
            //fetch blocks for root board
            const blocksResult = await api.fetchSharedBoardBlocks(token, board.id);
        
            if (blocksResult.success && blocksResult.data) {
                setBlocks(blocksResult.data.blocks);
            }
            
            setLoading(false);
        };

        loadSharedBoard();
    }, [token]);
    

    if (!currentBoard) return <p>Loading...</p>;
    //Navigate into nested board
     const navigateToBoard = async(linkedBoardId: string) => {
        if(!token || !linkedBoardId) return;
        setLoading(true);

        const boardResult = await api.fetchSharedNestedBoard(token, linkedBoardId);
        if (!boardResult.success || !boardResult.data) {
        setLoading(false);
        return;
        }

        const blocksResult = await api.fetchSharedBoardBlocks(token, linkedBoardId);

        setCurrentBoard(boardResult.data.board);
        setTitle(boardResult.data.board.title);

        setBlocks(blocksResult.success && blocksResult.data ? blocksResult.data.blocks : []);
        setLoading(false);
    }



    //Loading state
    if(loading ){
        return(
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <p>Loading...</p>
            </div>
        )
    }

    // Error state
    if (error || !currentBoard || !title) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="text-center">
                    <p className="text-xl mb-2">Board not found</p>
                    <p className="text-sm text-gray-500">This link may be invalid or expired</p>
                </div>
            </div>
        );
    }

    const sortedBlocks = [...blocks].sort((a, b) => a.location.zIndex - b.location.zIndex);
return (
    <div className="fixed inset-0 flex overflow-hidden">
    {tree && (
                <SharedSidebar
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    tree={tree}
                    currentBoardId={currentBoard.id}
                    onNavigate={navigateToBoard}
                    title={title}
                />
            )}

    
        <ReadOnlyCanvas
            title={title}
            blocks={sortedBlocks}
            onBoardClick={navigateToBoard}
            open={isSidebarOpen}
        />
   
  </div>
)
}