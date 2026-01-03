import type {Board} from "@/types.ts"
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useData } from "@/context/data.tsx";

export default function BoardDiv({id, title, updatedAt, userId}: Board){
    const updatedAtDate = new Date(updatedAt?._seconds * 1000);
    const navigate = useNavigate();
    const { updateBoard, deleteBoard } = useData();
    
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(title);

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

    return( 
        <div className=" flex flex-col flex-[0_0_calc(25%-1rem)]  h-[150px] bg-dark  border-accent border-t-3 border-b-5 border-r-5 border-l-2 rounded-lg
        transition-border duration-300
        hover:cursor-pointer hover:border-light-accent hover:shadow-md shadow-accent
        "
        onClick={() => navigate(`/boards/${id}`)} 
        >
            <div className="absolute inset-y-0 left-1 w- -translate-x-1/2 bg-black/30 pointer-events-none"></div>
            <div className="bg-highlight">
                <div className="flex items-center gap-2 px-0">
                    <div className="flex-1">
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

                <button
                        onClick={(e) => handleDelete(e)}
                        aria-label="Delete board"
                        title="Delete board"
                        className="ml-2 text-dark  w-7 h-7 flex items-center justify-center hover:text-white hover:cursor-pointer transition-colors duration-200"
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
            <p className="text-sm mt-auto text-right pr-2 pb-2 text-subtext">{updatedAtDate.toLocaleString()}</p>

        </div>
    )
}