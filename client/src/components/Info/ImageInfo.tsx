import { useEffect, useState, useCallback, useRef, type ChangeEvent } from "react";
import type { ImageBlockType } from "../../types"; 
import { useData } from "../../context/data";

export default function ImageInfo({ node }: { node: ImageBlockType }) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [title, setTitle] = useState(node.properties.title);
    const [url, setUrl] = useState(node.properties.url);
    const [pastedUrl, setPastedUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
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

    const uploadToFirebase = async (file:File): Promise<string | null> => {
        setIsUploading(true);
        setUploadError(null);
        
        try{
            const formData = new FormData();
            formData.append('file', file);
            formData.append('blockId', node.id);

            const response = await fetch('http://localhost:5000/api/upload-image', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error('Error uploading file:', error);
            setUploadError('Failed to upload image');
            return null;
        } finally {
            setIsUploading(false);
        }
    }
    const handleDrop = useCallback(
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                setUploadError('Please drop an image file');
                return;
            }

            const firebaseUrl = await uploadToFirebase(file);
            if (firebaseUrl) setUrl(firebaseUrl);
        },
        []
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Needed to allow drop
    };

    const handleButtonClick = () =>{
        fileInputRef.current?.click();
    }

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]

        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file');
            return;
        }

        const firebaseUrl = await uploadToFirebase(file);
        if (firebaseUrl) {
            setUrl(firebaseUrl);
        }

    }

     const handleUrlPaste = () => {
        if (pastedUrl.trim()) {
            setUrl(pastedUrl.trim());
            setPastedUrl("");
        }
    };

    const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleUrlPaste();
        }
    };

    return (
               <div className="text-left">
            {/* Title input */}
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="outline-none text-3xl font-bold mb-5 w-full"
            />

            {/* URL paste section */}
            <div className="mb-4">
                <label className="text-slate-300 text-sm mb-2 block">
                    Paste Image URL
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={pastedUrl}
                        onChange={(e) => setPastedUrl(e.target.value)}
                        onKeyDown={handleUrlKeyDown}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-3 py-2 bg-slate-800 text-slate-100 rounded outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleUrlPaste}
                        disabled={!pastedUrl.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        Use URL
                    </button>
                </div>
            </div>

            <div className="text-slate-300 text-sm mb-2">— OR —</div>

            {/* Upload section */}
            <p className="text-slate-100 mb-2">
                Drop an image or upload{" "}
                <button
                    onClick={handleButtonClick}
                    className="text-light-accent hover:cursor-pointer hover:underline"
                    disabled={isUploading}
                >
                    here
                </button>
            </p>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: "none" }}
            />

            {/* Error message */}
            {uploadError && (
                <div className="text-red-500 text-sm mb-2">{uploadError}</div>
            )}

            {/* Loading state */}
            {isUploading && (
                <div className="text-blue-500 text-sm mb-2">Uploading...</div>
            )}

            {/* Drag-and-drop zone + preview */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`p-4 min-h-[200px] flex flex-col gap-3 justify-center items-center border-2 border-dashed rounded ${
                    isUploading 
                        ? "border-blue-500 bg-blue-500/10" 
                        : "border-slate-600 hover:border-slate-500"
                }`}
            >
                {url ? (
                    <img
                        src={url}
                        alt={title || "Image"}
                        className="max-w-full max-h-[300px] object-contain rounded"
                    />
                ) : (
                    <div className="text-slate-400 text-center">
                        <p>Drag and drop an image here</p>
                        <p className="text-sm mt-2">or use the options above</p>
                    </div>
                )}
            </div>
        </div>
    );
}
