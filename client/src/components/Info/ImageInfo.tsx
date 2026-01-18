import { useEffect, useState, useCallback, useRef, type ChangeEvent } from "react";
import type { ImageBlockType } from "../../types/types"; 
import { useData } from "../../context/data";

export default function ImageInfo({ node }: { node: ImageBlockType }) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [title, setTitle] = useState(node.content.title);
    const [url, setUrl] = useState(node.content.url);
    const [pastedUrl, setPastedUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const { updateBlock } = useData();

    useEffect(() => {
        const timer = setTimeout(() => {
        updateBlock(node.id, {
            content: {
            ...node.content,
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
            if (url && url.includes('storage.googleapis.com')) {
            try {
                await deleteFromFirebase(url);
            } catch (error) {
                console.warn('Failed to delete old image:', error);
            }
        }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('blockId', node.id);

            const response = await fetch('http://localhost:5000/api/images/upload', {
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

    const deleteFromFirebase = async (imageUrl: string): Promise<void> => {
    try {
        const urlParts = imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        const response = await fetch(`http://localhost:5000/api/images/delete/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

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

     // Unused: URL paste handler
     /*
     const _handleUrlPaste = () => {
        if (pastedUrl.trim()) {
            setUrl(pastedUrl.trim());
            setPastedUrl("");
        }
    };
    */

    // URL input handler - not currently used
    /*
    const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleUrlPaste();
        }
    };
    */

    const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData("text");
        

        if (pastedText) {
            if (pastedText.startsWith("http")) {
                setUrl(pastedText.trim());
                return;
            }
        }

        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                const file = item.getAsFile();
                if (file) {
                    const firebaseUrl = await uploadToFirebase(file);
                    if (firebaseUrl) setUrl(firebaseUrl);
                    return;
                }
            }
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

            
            {/* Upload section */}
            
            <div className="text-slate-100 mb-2 flex gap-2">
                
                <button
                    onClick={handleButtonClick}
                    className="text-light-accent hover:cursor-pointer hover:underline"
                    disabled={isUploading}
                >
                    Upload
                </button>
                <p>
                    or drag an image.
                </p>
            </div>
            <input
                    type="text"
                    value={pastedUrl}
                    onChange={(e) => setPastedUrl(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Paste image or URL"
                     className="w-full block flex-1 px-3 py-2 bg-dark text-slate-100 rounded outline-none  "

                />

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
                className={`p-4 min-h-50 flex flex-col gap-3 justify-center items-center  ${
                    isUploading 
                        ? "border-blue-500 bg-blue-500/10" 
                        : "border-slate-600 hover:border-slate-500"
                }`}
            >
                {url ? (
                    <img
                        src={url}
                        alt={title || "Image"}
                        className="max-w-full max-h-75 object-contain rounded"
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
