import { useEffect, useState, useCallback, useRef, type ChangeEvent } from "react";
import type { ImageBlockType } from "../../types"; 
import { useData } from "../../context/data";

export default function ImageInfo({ node }: { node: ImageBlockType }) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [title, setTitle] = useState(node.properties.title);
    const [url, setUrl] = useState(node.properties.url);
    const { updateBlock } = useData();

    useEffect(() => {
        const timer = setTimeout(() => {
        updateBlock(node.id, {
            properties: {
            ...node.properties,
            title,
            url,
            },
        });
        }, 500);

        return () => clearTimeout(timer);
    }, [title, url, node.id]);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        },
        []
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Needed to allow drop
    };

    const handleButtonClick = () =>{
        fileInputRef.current?.click();
    }

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);

    }

    return (
        <div className="text-left">
        {/* Title input */}
        <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="outline-none text-3xl font-bold mb-5"
        />
            <p className="text-slate-100 ">Drop an image or upload <a className="text-light-accent hover:cursor-pointer" onClick={handleButtonClick}>here</a></p>
            <input
                type = "file"
                ref = {fileInputRef}
                onChange={handleFileChange}
                style={{display:'none'}}
            />

        {/* Drag-and-drop zone + preview */}
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="p-4 min-h-[200px] flex flex-col gap-3 justify-center items-center"
        >
            <img
                src={url}
                alt={title || "Image"}
                className="max-w-full max-h-[300px] object-contain rounded"
            />
        </div>
        </div>
    );
}
