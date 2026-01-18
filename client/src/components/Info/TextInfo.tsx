import { useEffect, useState } from "react";
import type { TextBlockType } from "../../types/types"; 
import { useData } from "../../context/data";

export default function TextInfo({node}:{node: TextBlockType}){
    const [title, setTitle] = useState<string>(node.content.title);
    const [body, setBody] = useState<string>(node.content.body);
    const { updateBlock } = useData();


    useEffect(() => {
        const timer = setTimeout(() => {
            if (title !== node.content.title || body !== node.content.body) {
                updateBlock(node.id, {
                    content: {
                        ...node.content,
                        title,
                        body
                    }
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [title, body, node.id]);


    return(
            <div className="text-left ">
                <input 
                    type="text"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className = "outline-none text-3xl font-bold mb-5"
                />                    
                <textarea
                    value={body} 
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Start writing. . ."
                    className = "block leading-relaxed min-h-100 w-full outline-none bg-transparent border-none "
                />
            </div>
            
    )
}