import React, {useState, useMemo, useContext, createContext} from 'react';
import type { ReactNode } from 'react';
import type { Block, BaseBlock, TextBlockType, ImageBlockType, DiaryBlockType, BasePageBlockType  } from '../types';
import rawData from "../data/data.json"

interface DataContextType {
    blocks: Block[];
    dataMap: Record<string, Block>; 
    root: BasePageBlockType | undefined;
    updateBlock: (id: string, updates: Partial<Block>) => void;
    addBlock: (block: Block) => void; 
    removeBlock: (id: string) => void;
}

// context is created? 
const DataContext = createContext<DataContextType | undefined>(undefined);

// provider component 
export function DataProvider({children} : {children : ReactNode}){
    const [blocks, setBlocks] = useState<Block[]>((getData()))
    
    const dataMap = useMemo(()=>{
        return Object.fromEntries(blocks.map( (b) => [b.id, b]));
    }, [blocks]);

    const root = useMemo(()=>{
        return blocks.find(id => id.parent === "none") as BasePageBlockType | undefined;
    }, [blocks])

    const updateBlock = (id: string, updates: Partial<Block>) => {
        setBlocks(prev => 
            prev.map( b => {
                if (b.id !== id) return b;
                switch (b.type) {
                    case "text":
                        return { ...b, ...updates } as Block;
                    case "base_page":
                        return { ...b, ...updates } as Block;
                    case "image":
                        return {...b, ...updates} as Block;
                    case "diary_entry":
                        return {...b, ...updates} as Block;
                    default: 
                        return b;
                }
            })
        )
    }

    const addBlock = (block: Block) =>{
        setBlocks(prev => [...prev, block]);
    }

    const removeBlock = (id: string) =>{
        setBlocks(prev => prev.filter(b => b.id !== id));
    }


    return (
        <DataContext.Provider value = {{blocks, dataMap, root, updateBlock, addBlock, removeBlock}}>
            {children}
        </DataContext.Provider>
    );
}

function getData(): Block[]{
    return rawData as Block[]
}

export function useData(){
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider")
    }
    return context;
}