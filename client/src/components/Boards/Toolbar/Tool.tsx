import type { Operation } from "@/types/editorTypes";
import type { Block, TextBlockType } from "@/types/types";
import PaintTool from "./Painttool";

export default function Tool({operation, selectedBlock, handleOperationClick}: {operation: Operation, selectedBlock: Block | null, handleOperationClick: (operation: Operation, params?: any) => void}){
    const isActive = selectedBlock && (() => {
                                        // Check if the operation is currently active TO DO: better check T_T
                                        if (operation.id === 'bold') return (selectedBlock as any).content?.bold;
                                        if (operation.id === 'italic') return (selectedBlock as any).content?.italic;
                                        if (operation.id === 'underline') return (selectedBlock as any).content?.underline;
                                        if (operation.id === 'grayscale') return (selectedBlock as any).content?.transforms?.grayscale;
                                        return false;
                                    })();
    if (operation.id == "bg-color"){
        return (<PaintTool operation={operation} selectedBlock={selectedBlock as TextBlockType} handleOperationClick={handleOperationClick}/>)
    }
    return(
        <button
            key={operation.id}
            onClick={() => handleOperationClick(operation)}
            disabled={!selectedBlock && operation.category !== 'universal'}
            className={`relative group px-3 py-2 rounded transition-colors ${
                isActive
                ? 'bg-accent hover:bg-light-accent text-white'
                : selectedBlock || operation.category === 'universal'
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
    )

}