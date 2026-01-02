import { useParams } from "react-router-dom";
import { useData } from "@/context/data";
import { useEffect } from "react";
import Canvas from "./Canvas";


export default function Board(){
    const {currentBoard, setCurrentBoardId} = useData()
    const { id } = useParams<{ id: string }>();

    if (currentBoard == null || id == null) return("");
    
    
    useEffect(()=>{
        console.log("THIS IS ID", id, "THIS IS CURRENT")
        setCurrentBoardId(id);
    }, [])
    
    console.log("THE ID", id)
    return(
        <Canvas />
    )
}