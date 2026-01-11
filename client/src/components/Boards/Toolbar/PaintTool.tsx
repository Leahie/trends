import { useData } from "@/context/data";
import type { Operation } from "@/types/editorTypes";
import type { Block, TextBlockType } from "@/types/types";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";


export default function PaintTool({operation, selectedBlockIds, handleOperationClick}: {operation: Operation, selectedBlockIds: string[], handleOperationClick: (operation: Operation, params: any) => void}){
    if (selectedBlockIds.length == 0) return;
    
    const [isOpen, setIsOpen] = useState(false);
    const [lastColor, setLastColor] = useState("#FFFFFF");

    const handleColorChange = async (color: string | null) => {
        if (color == null) {
            handleOperationClick(operation,  {color: undefined})
        }
        else{
            setLastColor(color);
            handleOperationClick(operation, {color: color})


        }
        
    }

    return(
        <div className="relative">
            <button
            key={operation.id}
            onClick={() => setIsOpen((prev)=> !prev)}
            disabled={selectedBlockIds.length == 0 && operation.category !== 'universal'}
            className={`relative group px-3 py-2 rounded transition-colors ${  
                selectedBlockIds.length != 0 || operation.category === 'universal'
                ? ' hover:bg-highlight text-white'
                : 'text-secondary cursor-not-allowed'
            }`}
            >
            {<operation.icon size={18}/>}
            <span
                className="
                pointer-events-none
                absolute
                -top-2 left-1/2 -translate-x-1/2 -translate-y-full
                whitespace-nowrap
                rounded-md
                bg-white/90
                px-2 py-1
                text-xs text-black
                opacity-0
                scale-95
                transition-all
                group-hover:opacity-100
                group-hover:scale-100
                "
            >
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-white/90" />

                {operation.label}
            </span>
        </button>
            {isOpen && (
            <>
            <div className="fixed inset-0 z-10" onMouseDown={() => setIsOpen((prev)=> !prev)} />

            <div className="absolute bottom-full mb-2 left-0 bg-dark rounded-xl shadow-lg z-20 p-3">
                <HexColorPicker
                color={lastColor}
                onChange={(color) => {
                    handleColorChange(color);
                }}
                />

                <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-400">{lastColor}</span>
                <button
                    onMouseDown={(e) => {
                    e.preventDefault();
                    handleColorChange(null);
                    }}
                    className="text-xs text-red-400 hover:underline"
                >
                    Clear
                </button>
                </div>
            </div>
            </>
        )}
        </div>
        
    )
}
