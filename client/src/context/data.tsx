import React, {useState, useMemo, useRef, useEffect, useContext, createContext} from 'react';
import type { ReactNode } from 'react';
import type { Block, BlockSizeType, BasePageBlockType  } from '../types';
import {api} from "../utils/api"

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

    // syncing [fear]
    syncNow: () => Promise<void>;
    isSyncing: boolean; 
    lastSyncTime: Date | null;
}

// context is created? 
const DataContext = createContext<DataContextType | undefined>(undefined);

// provider component 
export function DataProvider({children} : {children : ReactNode}){
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [locations, setLocations] = useState< Record<string, BlockSizeType>>({})
    const [isSyncing, setIsSynching] = useState<boolean>(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const pendingLocationChanges = useRef<Record<string, BlockSizeType>>({});
    const pendingBlockChanges = useRef<Record<string, Block>>({});
    const syncTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsSynching(true);
            const result = await api.fetchData();
            if (result.success && result.data){
                setBlocks(result.data.blocks);
                setLocations(result.data.locations);
                setLastSyncTime(new Date());
            } else {
                console.error('Failed to load initial data:', result.error);
            }
            setIsSynching(false);
        };
        loadData();
    }, [])


    

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
            [id]:{ ...prev.id, ...updates}
            })
        )
    }

    const addLocation = (size: BlockSizeType, id:string) => {
        setLocations((prev) => ({
            ...prev, 
            [id]: {...size}
            
        }))
    }

    const removeLocation = (blockId:string) => {
        setLocations((prev) => {
            const save = {...prev};
            delete save[blockId];
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

export function useData(){
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider")
    }
    return context;
}
