import type { Board } from "@/types/types";
import { useState } from "react";

interface SideItemProps { 
    board: Board; 
    isActive: boolean; 
    isOpen: boolean; 
    isPinned: boolean; 
    depth: number; 
    onNavigate: () => void; 
    onToggleOpen: () => void; 
    onDelete: () => void; 
    onTogglePin: () => void;
    onRename: () => void; 
    onAddChild: () => void;
    onDragStart: (e: React.DragEvent) => void; 
    onDragOver: (e:React.DragEvent) => void; 
    onDrop: (e:React.DragEvent) => void;
    onDragEnd: () => void; 
    children?: React.ReactNode; 
}

export default function SideItem({
  board,
  isActive,
  isOpen,
  isPinned,
  depth,
  onNavigate,
  onToggleOpen,
  onDelete,
  onTogglePin,
  onRename,
  onAddChild,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children
}: SideItemProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);
        onDragStart(e);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        onDragEnd();
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
        onDragOver(e);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop(e);
    };

    return(
        <li className="relative">
            <div
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                mb-1 flex items-center gap-2 py-2 px-2.5 rounded-lg text-sm text-white cursor-pointer
                ${isActive ? 'bg-accent' : ''}
                ${isDragOver ? 'bg-highlight/70 border-2 border-blue-400' : ''}
                ${isDragging ? 'opacity-50' : ''}
                hover:bg-highlight/50
                transition-all
                `}
                style={{ paddingLeft: `${depth * 12 + 10}px` }}
            >
                {children && (
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    onToggleOpen();
                    }}
                    className="flex items-center justify-center w-4 h-4 hover:bg-white/10 rounded"
                >
                    {isOpen ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    )}
                </button>
                )}
                {/* pin */}
                {isPinned && (
                <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78.09 1.632.832 2.053L5 15v1a1 1 0 11-2 0v-1a2 2 0 01-1.236-1.693l.817-2.552L5 10.274z"/>
                </svg>
                )}

                {/* title */}
                <span className="flex-1 truncate" onClick={onNavigate}>
                    {board.title || 'Untitled Board'}
                </span>

                {/* more menu */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="flex items-center justify-center w-5 h-5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100"
                    >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                </button>

                {showMenu && (
                <div 
                    className="absolute right-0 top-full mt-1 w-48 bg-dark border border-highlight rounded-lg shadow-xl z-50"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                    onClick={() => { setShowMenu(false); onTogglePin(); }}
                    className="w-full text-left px-4 py-2 hover:bg-highlight text-sm"
                    >
                    {isPinned ? ' Unpin' : ' Pin'}
                    </button>
                    <button
                    onClick={() => { setShowMenu(false); onAddChild(); }}
                    className="w-full text-left px-4 py-2 hover:bg-highlight text-sm"
                    >
                     Add Child Board
                    </button>
                    <button
                    onClick={() => { setShowMenu(false); onRename(); }}
                    className="w-full text-left px-4 py-2 hover:bg-highlight text-sm"
                    >
                     Rename
                    </button>
                    <hr className="border-highlight my-1" />
                    <button
                    onClick={() => { setShowMenu(false); onDelete(); }}
                    className="w-full text-left px-4 py-2 hover:bg-red-600 text-sm text-red-400"
                    >
                     Delete
                    </button>
                </div>
                )}
            </div>

            {/* Children */}
            {isOpen && children && (
                <ul className="ml-2">{children}</ul>
            )}
        </li>
    )
}