import { useData } from "@/context/data";
import { 
  createDefaultTextBlock, 
  createDefaultBoardBlock,
  createDefaultLocation 
} from "@/utils/defaults";

import type { Block, ImageBlockType } from "@/types/types";

import { useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";

// HOOKS 
import { uploadToFirebase } from "@/hooks/uploadToFirebase";
import { useAuth } from "@/context/auth";
import { useEditor } from "@/context/editor";
import { useSidebar } from "@/context/sidebar";
export default function Context({x, y, parentId, canvasX, canvasY ,setContextMenu, bringToFront, pushToBack}:
    
    {x:number, y:number, selected:string[], parentId: string, canvasX: number, canvasY: number, 
        setContextMenu : (value: {x: number, y:number, canvasX:number, canvasY: number} | null) => void 
        bringToFront: (id: string[]) => Promise<void> 
        pushToBack: (id:string[]) => Promise<void>}){
    const navigate = useNavigate();
    const {getIdToken} = useAuth()
    const {dataMap, blocks, createBoard, updateBlock, removeBlock, addBlock,
        batchUpdateBlocks, syncNow
    } = useData();
    const {openBoard} = useSidebar();
    const {selectedBlockIds, pushToHistory, copyBlocks, 
        cutBlocks, 
        pasteBlocks,
        clipboard} = useEditor();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const menuRef = useRef<HTMLDivElement | null>(null);
    
    console.log("yo this the context cords", x, y, canvasX, canvasY);
    const createNew = async (type: "text" | "image" | "board_block") => {
        // Get max z-index to place new block on top
        const maxZ = Math.max(...Object.values(blocks).map(b => b.location.zIndex), 0);
        
        let block: Partial<Block>;
        
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

        const success = await addBlock({...block, "location": {...location}, "boardId":parentId});
        if (success != null) {
            if (type == "board_block"){
                const result = await createBoard(undefined, success.id);
                if (result != null) openBoard(result?.id);
                navigate(`/boards/${success.id}`)
            }
            setContextMenu(null);
            pushToHistory({}, {success});
        }
        syncNow();
        
    };

    const handleCopy = () => {
        if (selectedBlockIds.length > 0) {
            copyBlocks(selectedBlockIds);
            setContextMenu(null);
        }
    };

    const handleCut = async () => {
        if (selectedBlockIds.length > 0) {
            await cutBlocks(selectedBlockIds);
            setContextMenu(null);
        }
    };

    const handlePaste = async () => {
        await pasteBlocks(canvasX, canvasY, parentId);
        setContextMenu(null);
    };

    
    const handleDelete = async () => {
        if (selectedBlockIds.length === 0) return;

        const before: Record<string, Block> = {};
        selectedBlockIds.forEach(id => {
            const block = dataMap[id];
            if (block) before[id] = structuredClone(block);
        });

        for (const selected of selectedBlockIds) {
            const success = await removeBlock(selected);
            if (success) {
            console.log('Block deleted successfully');
            }
        }

        pushToHistory(before, {});

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
                    imgHeight: dimensions.height,
                    subtitle: false,
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

    const handleOperationClick = async(func: (arg0: string[]) => Promise<void>) => {
    
            if (selectedBlockIds.length==0) return;

            const before: Record<string, Block> = structuredClone(dataMap);
    
            await func(selectedBlockIds);
            await syncNow();

            const after: Record<string, Block> = structuredClone(dataMap);
            pushToHistory(before, after);
            setContextMenu(null);
        }
    
        useEffect(() => {
            const handlePointerDown = (e: PointerEvent) => {
                if (!menuRef.current) return;

                if (!menuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
                }
            };

            document.addEventListener("pointerdown", handlePointerDown);

            return () => {
                document.removeEventListener("pointerdown", handlePointerDown);
            };
        }, [setContextMenu]);

    const handleToggleSubtitle = async() => {

        if(selectedBlockIds.length==1 && dataMap[selectedBlockIds[0]].type == "image"){
            console.log("DO YOU GET HERE ")
            const block: ImageBlockType = dataMap[selectedBlockIds[0]]  
            const curr = block.content.subtitle || null;
            let updates = {}
            if (!curr) updates = {content: {...block.content, subtitle: true}};
            else{
                updates = {content: {...block.content, subtitle: !block.content.subtitle}};
            }
            await updateBlock(block.id, updates);
        }
    }

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
        style={{ top: y, left: x, position: "absolute", }}
        ref = {menuRef}
        >
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
                {/* Clipboard operations */}
                {selectedBlockIds.length > 0 && (
                    <>
                        <hr className="my-2.5 ml-1 mr-4 text-light-accent/50" />
                        <li className="context-li" onClick={handleCopy}>Copy</li>
                        <li className="context-li" onClick={handleCut}>Cut</li>
                    </>
                )}

                {clipboard.length > 0 && (
                    <>
                        <li className="context-li" onClick={handlePaste}>
                            Paste ({clipboard.length} block{clipboard.length !== 1 ? 's' : ''})
                        </li>
                    </>
                )}

                {
                    selectedBlockIds.length!=0 && 
                    <>
                    <hr className=" my-2.5 ml-1 mr-4 text-light-accent/50" />
                    <li className="context-li" onClick={()=> handleOperationClick(bringToFront)}>Bring To Front</li>
                    <li className="context-li" onClick={()=> handleOperationClick(pushToBack)}>Push To Back</li>
                    <li className="context-li" onClick={()=> handleDelete()}>Delete</li>
                        
                    </>

                }
                { selectedBlockIds.length==1 && dataMap[selectedBlockIds[0]].type == "image" &&
                    <li className="context-li"
                    onClick={() => handleToggleSubtitle()}>
                        Toggle Subtitle
                    </li>}

            </ul>
        </div>
        </>
    )
}