import { useEffect, useRef } from "react";

interface UseImagePasteProps {
    onImagePaste: (file: File, x: number, y: number) => void;
    canvasRef: React.RefObject<HTMLDivElement| null> ;
    scale: number; 
    pan: { x: number; y: number };
}

// hook to handle image pasting; goal have image addition similar to pureref
export function useImagePaste({onImagePaste, canvasRef, scale, pan}: UseImagePasteProps) {
    const lastMousePos = useRef({x:0, y:0});

    useEffect(()=>{
        if (canvasRef.current == null) return;

        const handleMouseMove = (e:MouseEvent) => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                lastMousePos.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }
        }
    
    
        const handlePaste = async(e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return; 

            for (let i = 0; i< items.length; i++){
                if (items[i].type.indexOf('image') !== -1){
                    e.preventDefault();
                    const file = items[i].getAsFile();
                    if(!file) continue;

                    const canvasX = (lastMousePos.current.x - pan.x) / scale;
                    const canvasY = (lastMousePos.current.y - pan.y) / scale;

                    onImagePaste(file, canvasX, canvasY);
                    break;
                }
            }
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('paste', handlePaste);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('paste', handlePaste);
        };
    }, [onImagePaste, canvasRef, scale, pan]);
}

