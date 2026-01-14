import { useData } from "@/context/data";
import { 
  createDefaultTextBlock, 
  createDefaultBoardBlock,
  createDefaultLocation 
} from "@/utils/defaults";

import type { Block, ImageBlockType } from "@/types/types";

import { useRef } from "react";
import { useNavigate } from "react-router-dom";

// HOOKS 
import { uploadToFirebase } from "@/hooks/uploadToFirebase";
import { useAuth } from "@/context/auth";
import { useEditor } from "@/context/editor";
import { useSidebar } from "@/context/sidebar";
export default function Context({x, y, parentId, canvasX, canvasY ,setContextMenu, bringToFront, pushToBack}:
    {x:number, y:number, selected:string[], parentId: string, canvasX: number, canvasY: number, 
        setContextMenu : (value: {x: number, y:number, canvasX:number, canvasY: number} | null) => void 
        bringToFront: (id: string) => void 
        pushToBack: (id:string) => void}){
    const {getIdToken} = useAuth()
    const {blocks, createBoard, updateBlock, removeBlock, addBlock} = useData();
    const {openBoard} = useSidebar();
    const {selectedBlockIds} = useEditor();
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    
    const createNew = async (type: "text" | "image" | "board_block") => {
        // Get max z-index to place new block on top
        const maxZ = Math.max(...Object.values(blocks).map(b => b.location.zIndex), 0);
        
        let block: Partial<Block>;
        console.log(parentId);
        
        if (type === "image") {
            fileInputRef.current?.click();
            return;
        }
        
        switch(type) {
            case "text": 
                block = createDefaultTextBlock(parentId);
                break;
            case "board_block":
                block = createDefaultBoardBlock(parentId);
                break;

        }
        
        const location = createDefaultLocation(canvasX, canvasY, maxZ + 1);
        
        console.log("BLOCK", block, "LOCATION", location,"PARENID", parentId )
        const success = await addBlock({...block, "location": {...location}, "boardId":parentId});
        if (success != null) {
            if (type == "board_block"){
                const result = await createBoard(undefined, success.id);
                if (result != null) openBoard(result?.id);
            }
            setContextMenu(null);
        }
    };
    const handleDelete = async () => {
        for (const selected of selectedBlockIds) {
            const success = await removeBlock(selected);
            if (success) {
            console.log('Block deleted successfully');
            }
        }

        setContextMenu(null);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Convert to base64
        const reader = new FileReader();
        reader.onload = async (event) => {
            const token = await getIdToken();

            if (token == null) return;
            const firebaseUrl = await uploadToFirebase({file, token});
            
            if (!firebaseUrl){
                console.error('Oops failed');
                return;
            }
            
            const img = new Image();
            const dimensions: { width: number; height: number } = await new Promise((resolve, reject) => {
                img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = reject;
                img.src = firebaseUrl;
            });

            const maxZ = Math.max(...blocks.map(b => b.location.zIndex), 0);
            
            const imageBlock:Partial<ImageBlockType> = {
                type: 'image' as const,
                boardId: parentId,
                content: {
                    title: "Untitled",
                    url: firebaseUrl,
                    source: 'external',
                    imgWidth: dimensions.width,   // <-- store original dimensions
                    imgHeight: dimensions.height
                },
                location: {
                    ...createDefaultLocation(canvasX, canvasY, maxZ + 1),
                    width: dimensions.width,
                    height: dimensions.height,
                }
            };

            await addBlock(imageBlock);
            setContextMenu(null);
        };
        reader.readAsDataURL(file);
        
        // Reset input so same file can be selected again
        e.target.value = '';
    };


    console.log("selected", selectedBlockIds);
    return(
        <>
        <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
        />

        <div className="text-left  absolute w-fit h-fit flex flex-col bg-white border text-black text-[11px] rounded shadow cursor-default " 
        style={{ top: y, left: x, position: "absolute", }}>
            <ul className=" w-full py-3">
                <li></li>
                <li className="context-li">Add</li>
                <hr className="ml-1 mr-4 text-light-accent/50" />
                <ul className="">
                    <li className="context-li"
                    onClick={() => createNew("text")}>
                        Text Block
                    </li>
                    <li className="context-li"
                    onClick={() => createNew("image")}
                    >
                        Image Block
                    </li>
                    <li className="context-li"
                    onClick={() => createNew("board_block")}>
                        Board Block
                    </li>
                </ul>
                {
                    selectedBlockIds.length!=0 && 
                    <>
                    <hr className=" mt-2.5 ml-1 mr-4 text-light-accent/50" />
                    {/* <li className="context-li" onClick={()=> bringToFront(selected)}>Bring To Front</li>
                    <li className="context-li" onClick={()=> pushToBack(selected)}>Push To Back</li> */}
                    <li className="context-li" onClick={()=> handleDelete()}>Delete</li>
                        
                    </>

                }
            </ul>
        </div>
        </>
    )
}