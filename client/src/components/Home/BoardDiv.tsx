import type {Board} from "@/types/types"
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useData } from "@/context/data.tsx";
import { useSidebar } from "@/context/sidebar";

export default function BoardDiv({id, title, updatedAt, userId: _userId, parentBoardBlockId}: Board){

    const updatedAtDate = updatedAt instanceof Date ? updatedAt : new Date((updatedAt as any)?._seconds * 1000);
    const navigate = useNavigate();
    const { getParent, getChildren, updateBoard, archiveBoard, deleteBoard, boardsMap } = useData();
    const { openBoard } = useSidebar()
    
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const [parent, setParent] = useState(parentBoardBlockId ? getParent(id) : null);
    const [children, setChildren] = useState(getChildren(id));

    useEffect(()=>{
        setParent(parentBoardBlockId ? getParent(id) : null);
        setChildren(getChildren(id))
    }, [boardsMap])
    const handleTitleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditTitle(e.target.value);
    };

    const handleTitleBlur = async () => {
        if (editTitle.trim() && editTitle !== title) {
            setIsEditing(false);
            // Update UI immediately (optimistic update)
            // Then sync with server in background
            await updateBoard(id, { title: editTitle });
        } else {
            setIsEditing(false);
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleBlur();
        } else if (e.key === 'Escape') {
            setEditTitle(title);
            setIsEditing(false);
        }
    };

    const handleDelete = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Delete this board? This cannot be undone.')) return;
        try {
            await deleteBoard(id);
        } catch (err) {
            console.error('Failed to delete board', err);
        }
    };

    const handleArchive = async (e: React.MouseEvent) => {
        if (e) e.stopPropagation();
        // if (!window.confirm('Archive this board? You can restore it later.')) return;
        try {
            await archiveBoard(id);
        } catch (err) {
            console.error('Failed to archive board', err);
        }
    }

    return( 
        <div className=" flex flex-col flex-[0_0_calc(25%-1rem)]  h-37.5 bg-dark  border-accent border-t-3 border-b-5 border-r-5 border-l-2 rounded-lg
        transition-border duration-300
        hover:cursor-pointer hover:border-light-accent hover:shadow-md shadow-accent
        "
        onClick={() => { openBoard(id) ;navigate(`/boards/${id}`)}} 
        >
            <div className="absolute inset-y-0 left-1 w- -translate-x-1/2 bg-black/30 pointer-events-none"></div>
            <div className="bg-highlight">
                <div className="flex items-center justify-between gap-2 px-0">
                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={handleTitleChange}
                                onBlur={handleTitleBlur}
                                onKeyDown={handleTitleKeyDown}
                                autoFocus
                                className="
                                    bg-highlight
                                    text-xl
                                    font-semibold
                                    pl-4
                                    py-1
                                    text-left
                                    outline-none
                                    w-full
                                "
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <h5 
                                onClick={handleTitleClick}
                                className="
                                    bg-highlight
                                    text-xl
                                    font-semibold
                                    truncate
                                    whitespace-nowrap
                                    overflow-hidden
                                    pl-4
                                    py-1
                                    text-left
                                    hover:opacity-80
                                    cursor-text
                                "
                            >{title}</h5>
                        )}
                    </div>
                <div className="flex items-center gap-1 ml-3">
                    <button
                    onClick={(e) => handleArchive(e)}
                    aria-label="Archive board"
                    title="Archive board"
                    className="ml-2 text-dark w-7 h-7 flex items-center justify-center hover:text-white hover:cursor-pointer transition-colors duration-200">
                    <svg 
                        className="h-4 w-4" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" viewBox="0 0 24 24" 
                        strokeWidth={2} stroke="currentColor" 
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                        />
                    </svg>

                </button>
                <button
                        onClick={(e) => handleDelete(e)}
                        aria-label="Delete board"
                        title="Delete board"
                        className="text-dark  w-7 h-7 flex items-center justify-center hover:text-white hover:cursor-pointer transition-colors duration-200"
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-4 w-4" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            strokeWidth={2}
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                            />
                        </svg>
                    </button>
                </div>
                
                </div>
                
            </div>
            {/* Parent-Child Relationships */}
                <div className="text-sm text-gray-600 space-y-1 text-left p-2">
                    {parent && (
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400">Folder:</span>
                            <span className="font-medium truncate">
                                {parent.title || "Untitled"}
                            </span>
                        </div>
                    )}

                    {children.length > 0 && (
                        <div className="flex items-baseline gap-1 ">
                            <span className="text-subtext">Files:</span>
                            <div className="flex flex-wrap gap-1 align-end">
                                {children.map((child, idx) => (
                                    <span
                                        key={child.id}
                                        className="text-xs"
                                    >
                                        {child.title || "Untitled"}
                                        {idx < children.length - 1 ? "," : ""}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {!parent && children.length === 0 && (
                        <div className="text-subtext italic"></div>
                    )}
                </div>
            <p className="text-sm mt-auto text-right pr-2 pb-2 text-subtext">{updatedAtDate.toLocaleString()}</p>

        </div>
    )
}