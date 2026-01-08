import { useParams, useNavigate } from "react-router-dom";
import { useData } from "@/context/data";
import { useEffect, useState } from "react";
import { EditorProvider } from "@/context/editor";

import Canvas from "./Canvas";


export default function Board(){
    const {currentBoard, setCurrentBoardId, isSyncing, boardLoadError,updateBlock } = useData()
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    
    useEffect(() => {
        if (id && id !== currentBoard?.id) {
            setCurrentBoardId(id);
        }
    }, [id]);

    // for failures
    useEffect(() => {
        if (boardLoadError === id) {
            console.error('Board not found, redirecting:', id);
            navigate('/', { replace: true });
        }
    }, [boardLoadError, id, navigate]);


    if (!id) {
        navigate('/', { replace: true });
        return null;
    }

    if ( !currentBoard) {
        console.log("IT'S ME HERE")
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-white">Loading board...</p>
            </div>
        );
    }

    return (
        <EditorProvider updateBlock={updateBlock}>
            <Canvas />
        </EditorProvider>
    );
}