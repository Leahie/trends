import React, {useState, useMemo, useContext, createContext} from 'react';
import type { ReactNode } from 'react';
import type { Block, BlockSizeType, BasePageBlockType  } from '../types';
import rawData from "../data/data.json"
import rawBlockStates from "../data/block_states.json"

interface DataContextType {
    blocks: Block[];
    dataMap: Record<string, Block>; 
    root: BasePageBlockType;
    // location 
    locations:  Record<string, BlockSizeType>;
    setLocations: (prev: Record<string, BlockSizeType>) => void;
    getLocation: (blockId: string ) => BlockSizeType;
    updateLocation: (id: string, updates: Partial<BasePageBlockType>) => void;
    addLocation: (size: BlockSizeType, id:string) => void;
    removeLocation: (blockId: string) => void;

    // blocks
    updateBlock: (id: string, updates: Partial<Block>) => void;
    addBlock: (block: Block) => void; 
    removeBlock: (id: string) => void;
}

// context is created? 
const DataContext = createContext<DataContextType | undefined>(undefined);

// provider component 
export function DataProvider({children} : {children : ReactNode}){
    const [blocks, setBlocks] = useState<Block[]>(getData());
    const [locations, setLocations] = useState< Record<string, BlockSizeType>>(getLocations())

    const dataMap = useMemo(()=>{
        return Object.fromEntries(blocks.map( (b) => [b.id, b]));
    }, [blocks]);

    const root = useMemo(()=>{
        return blocks.find(id => id.parent === "none") as BasePageBlockType ;
    }, [blocks])

    // GETTING AND UPDATING LOCATIONS
    const getLocation = (blockId: string):BlockSizeType => {
        return locations[blockId];
    }
    
    const updateLocation = (id: string, updates: Partial<BasePageBlockType>) => {
        setLocations( (prev) => ({
            ...prev, 
            id:{ ...prev.id, ...updates}
            })
        )
    }

    const addLocation = (size: BlockSizeType, id:string) => {
        setLocations((prev) => ({
            ...prev, 
            id: {...size}
            
        }))
    }

    const removeLocation = (blockId:string) => {
        setLocations((prev) => {
            const save = {...prev};
            delete save.blockId;
            return save;
        });
    }

    // UPDATING THE BLOCK
    const updateBlock = (id: string, updates: Partial<Block>) => {
        console.log(id, updates)
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
        <DataContext.Provider value = {{blocks, dataMap, root, updateBlock, addBlock, removeBlock, locations, getLocation, updateLocation, addLocation, removeLocation, setLocations}}>
            {children}
        </DataContext.Provider>
    );
}

function getData(): Block[]{
    return rawData as Block[]
}


// Datamap has id: data 
// Start from root and then getContent to find children

// construct locations parent: map of all kids 
function getLocations():Record<string, BlockSizeType>{
    return rawBlockStates as Record<string, BlockSizeType>;
}

export function useData(){
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider")
    }
    return context;
}
