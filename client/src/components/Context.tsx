import { useData } from "../context/data";
import { 
  createDefaultTextBlock, 
  createDefaultImageBlock, 
  createDefaultDiaryBlock,
  createDefaultLocation 
} from "../utils/defaults";

import type { Block } from "../types";


export default function Context({x, y, selected, parentId, canvasX, canvasY ,setContextMenu}:
    {x:number, y:number, selected:string|null, parentId: string, canvasX: number, canvasY: number, setContextMenu : (x: number, y:number, canvasX:number, canvasY: number | null) => void }){
    const {dataMap, removeBlock, addBlock, locations, syncNow} = useData();
    const createNew = async (type: "text" | "image" | "diary_entry") => {
        // Get max z-index to place new block on top
        const maxZ = Math.max(...Object.values(locations).map(loc => loc.zIndex), 0);
        
        let block: Block;
        console.log(parentId);
        
        
        switch(type) {
        case "text": 
            block = createDefaultTextBlock(parentId);
            break;
        case "image":
            block = createDefaultImageBlock(parentId);
            break;
        case "diary_entry":
            block = createDefaultDiaryBlock(parentId);
            break;
        }
        
        const location = createDefaultLocation(canvasX, canvasY, maxZ + 1);
        
        const success = await addBlock(block, location, parentId);

        if (success) {
            console.log(`Created ${type} block successfully`);
            setContextMenu(null);
        }
    };
    const handleDelete = async () => {
        if (selected) {
            const success = await removeBlock(selected, parentId);
            if (success) {
                console.log('Block deleted successfully');
                setContextMenu(null);
            }
        }
    };

    console.log("selected", selected);
    return(
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
                    onClick={() => createNew("diary_entry")}>
                        Diary Block
                    </li>
                </ul>
                {
                    selected!=null && 
                    <>
                    <hr className=" mt-2.5 ml-1 mr-4 text-light-accent/50" />
                        <li className="context-li" onClick={()=> handleDelete()}>Delete</li>
                        
                    </>

                }
            </ul>
        </div>
    )
}