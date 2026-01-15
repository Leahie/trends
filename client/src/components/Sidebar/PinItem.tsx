import { useSidebar } from "@/context/sidebar";
import type { Board } from "@/types/types";
import { useState } from "react";
import { BookOpen, Dot, Folder, FolderOpen, X } from "lucide-react";

interface SideItemProps { 
    board: Board; 
    onNavigate: () => void; 
    onToggleOpen: () => void; 
    onDelete: () => void; 
    onTogglePin: () => void;
    onRename: () => void; 
    onAddChild: () => void;
    onDragStart: (e: React.DragEvent) => void; 
    onDragOver: (e: React.DragEvent) => void; 
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void; 
    isBoardOpen: boolean;
    children?: React.ReactNode
}

export default function PinItem({
  board,
  onNavigate,
  onDelete,
  onTogglePin,
  onRename,
  onAddChild,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
  onToggleOpen, 
}: SideItemProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const {closeBoard,} = useSidebar();

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);
        onDragStart(e);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        onDragEnd();
    };

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

    return (
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
                ${isDragOver ? 'bg-highlight/70 border-2 border-blue-400' : ''}
                ${isDragging ? 'opacity-50' : ''}
                hover:bg-highlight/50
                transition-all group
                `}
            >
                {children && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleOpen();
                        }}
                        className="flex items-center justify-center  hover:bg-white/10 rounded"
                    >
           
                    </button>
                )}
                {!children && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleOpen();
                        }}
                        className="flex items-center justify-center  "
                    >

                    </button>
                )}


                <span className="flex-1 truncate" onClick={onNavigate}>
                    {board.title || 'Untitled Board'}
                </span>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="flex items-center justify-center w-5 h-5 hover:opacity-80 rounded opacity-0 group-hover:opacity-40"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                </button>

                <button 
                    onClick={() => closeBoard(board.id)}
                    className="hover:opacity-80 rounded opacity-0 group-hover:opacity-40"
                >
                    <X />
                </button>

                {showMenu && (
                    <div 
                        className="absolute right-0 top-full mt-1 py-1 w-48 bg-dark border border-highlight rounded-lg shadow-xl z-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => { setShowMenu(false); onTogglePin(); }}
                            className="w-full text-left px-4 py-2 hover:bg-highlight/50 text-sm"
                        >
                            { 'Unpin' }
                        </button>

                        <button
                            onClick={() => { setShowMenu(false); onRename(); }}
                            className="w-full text-left px-4 py-2 hover:bg-highlight/50 text-sm"
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

            {children && (
                <ul className="ml-2">{children}</ul>
            )}
        </li>
    );
}