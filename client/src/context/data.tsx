import React, {useState, useMemo, useRef, useEffect, useContext, createContext, useCallback} from 'react';
import type { ReactNode } from 'react';
import type { Block, BlockSizeType, BasePageBlockType  } from '../types';
import {api} from "../utils/api"
import { useAuth } from './auth';
import { v4 as uuidv4 } from 'uuid';



interface DataContextType {
    blocks: Block[];
    dataMap: Record<string, Block>; 
    root: BasePageBlockType;
    // location 
    locations:  Record<string, BlockSizeType>;
    setLocations: (prev: Record<string, BlockSizeType>) => void;
    getLocation: (blockId: string ) => BlockSizeType;
    updateLocation: (id: string, updates: Partial<BasePageBlockType>) => void;

    // blocks
    updateBlock: (id: string, updates: Partial<Block>) => void;
    addBlock: (block: Block, location: BlockSizeType, parentId?: string) => Promise<boolean>; 
    removeBlock: (id: string, parentId?:string) => Promise<boolean>;

    // syncing [fear]
    syncNow: () => Promise<void>;
    isSyncing: boolean; 
    lastSyncTime: Date | null;
}

// context is created? 
const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_ROOT_BLOCK: BasePageBlockType = {
  id: uuidv4(),
  type: "base_page",
  parent: "none",
  properties: { 
    title: "Open Diary", 
    colorscheme: {
        black: "#141613", 
        dark : "#2C302B",
        highlight : "#596157", 
        accent: "#6C816F",
        "light-accent": "#90A694",
        white: "#F5F1ED",
        "light-hover": "#D8D8D8"
      }},
  content: [],
};

// provider component 
export function DataProvider({children} : {children : ReactNode}){
    const {user} = useAuth();
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [locations, setLocations] = useState< Record<string, BlockSizeType>>({})
    const [isSyncing, setIsSynching] = useState<boolean>(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const pendingLocationChanges = useRef<Record<string, BlockSizeType>>({});
    const pendingBlockChanges = useRef<Record<string, any>>({});
    const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const loadData = async () => {
            console.log(user);

            setIsSynching(true);
            const result = await api.fetchData();
            if (result.success && result.data) {
                let fetchedBlocks = result.data.blocks;
                let fetchedLocations = result.data.locations;
            
                const root = fetchedBlocks.find(b => b.parent === "none");

                if (!root) {
                    console.log("No root found — creating one.");

                    await api.addBlock(DEFAULT_ROOT_BLOCK, fetchedLocations[DEFAULT_ROOT_BLOCK.id]);
                }

                const result2 = await api.fetchData();

                setBlocks(result2.data?.blocks);
                setLocations(result2.data?.locations);
                setLastSyncTime(new Date());
            } else {
                console.error('Failed to load initial data:', result.error);
            }
            setIsSynching(false);
        };
        loadData();
    }, [])

    const dataMap = useMemo(() => {
    return Object.fromEntries(blocks.map((b) => [b.id, b]));
  }, [blocks]);

    const root = useMemo(()=>{
        const foundRoot = blocks.find(b => b.parent === "none") as BasePageBlockType;
        return foundRoot || null;
    }, [blocks])

    const scheduledSync = useCallback( () => {
        if (syncTimeout.current){
            clearTimeout(syncTimeout.current);
        }
        syncTimeout.current = setTimeout(async () => {
            await performSync();
        }, 2000);
    }, [])

    const performSync = async () => {
        const locationChanges = {...pendingLocationChanges.current};
        const blockChanges = {...pendingBlockChanges.current};

        if (Object.keys(locationChanges).length == 0 && Object.keys(blockChanges).length == 0) 
            return;

        setIsSynching(true);
        let hasErrors = false;
        try {
            if (Object.keys(locationChanges).length > 0) {
                const result = await api.batchUpdateLocations(locationChanges);
                if (result.success){
                    pendingLocationChanges.current = {};
                }
            }

            if (Object.keys(blockChanges).length > 0){
                for (const[id, updates] of Object.entries(blockChanges)){
                    const results = await api.updateBlock(id, updates);
                    if (results.success) delete pendingBlockChanges.current[id];
                    else hasErrors = true;
                }
            }

            if (!hasErrors){
                setLastSyncTime(new Date());
            }

        } catch (error) {
            hasErrors = true;            
        } finally {
            setIsSynching(false);
        }

        return !hasErrors;
    }
    
    const syncNow = async () => {
        if (syncTimeout.current){
            clearTimeout(syncTimeout.current);
        }
        await performSync();   
    }

    useEffect(() => {
        const interval = setInterval(() => {
            performSync();
        }, 30000);

        return () => clearInterval(interval);
    }, [])
    

    // GETTING AND UPDATING LOCATIONS
    const getLocation = (blockId: string):BlockSizeType => {
        return locations[blockId];
    }
    
    const updateLocation = (id: string, updates: Partial<BasePageBlockType>) => {
        setLocations( (prev) => ({
            ...prev, 
            [id]:{ ...prev[id], ...updates}
            })
        )
        console.log("updating location")
        pendingLocationChanges.current[id] = {
        ...(pendingLocationChanges.current[id] || {}),  
        ...updates 
    }

        scheduledSync();
    }

    // UPDATING THE BLOCK
    const updateBlock = (id: string, updates: Partial<Block>) => {
        setBlocks(prev => 
            prev.map(b => b.id === id ? { ...b, ...updates } as Block : b)
        )
        
        pendingBlockChanges.current[id] = {
            ...(pendingBlockChanges.current[id] || {}),
            ...updates 
        }
        
        scheduledSync();
    }


    const addBlock = async(block: Block, location: BlockSizeType, parentId?: string) => {
        setBlocks(prev => [...prev, block]);
        setLocations((prev) => ({
            ...prev, 
            [block.id]: {...location}
        }));
        
        let updatedParentContent: string[] | undefined;

        if (parentId) {
            setBlocks(prev => {
                return prev.map(b => {
                    if (b.id !== parentId) return b;
                    if (!("content" in b)) return b;
                    
                    // Check if already exists to prevent duplicates
                    if (b.content.includes(block.id)) return b;
                    const newContent = [...b.content, block.id];
                    updatedParentContent = newContent; // Capture the new content
                    
                    return { ...b, content: newContent };
                });
            });
        }
        
        const result = await api.addBlock(block, location);
        
        if (!result.success) {
            // Rollback everything on failure
            setBlocks(prev => prev.filter((b) => b.id !== block.id));
            setLocations(prev => {
                const copy = {...prev};
                delete copy[block.id];
                return copy;
            });
            
            if (parentId) {
                setBlocks(prev => {
                    return prev.map(b => {
                        if (b.id !== parentId) return b;
                        if (!("content" in b)) return b;
                        return { ...b, content: b.content.filter(id => id !== block.id) };
                    });
                });
            }
            
            return false;
        }
        
        if (parentId && updatedParentContent) {
            await api.updateBlock(parentId, { content: updatedParentContent });
        }
    
        return true;
    }

    const removeBlock = async(id: string, parentId:string) =>{
        const block: (Block | undefined) = blocks.find(b => b.id == id);
        const location = locations[id];
        if (!block) return false;
        setBlocks(prev => prev.filter(b => b.id !== id));
        setLocations(prev => {
            const copy = {...prev};
            delete copy[id];
            return copy;
        })
        delete pendingBlockChanges.current[id];
        delete pendingLocationChanges.current[id];


        const result = await api.deleteBlock(id);
        if (!result.success){
            setBlocks(prev => ([...prev, block]));
            setLocations(prev => (
                {...prev, [id]:location}
            ))
            return false;
        }

        if (parentId) {
            console.log("Got into ParentID")
            const parentBlock = blocks.find(b => b.id === parentId);
            if (parentBlock && 'content' in parentBlock) {
                const newContent = parentBlock.content.filter(childId => childId !== id);
                setBlocks(prev => prev.map(b => b.id === parentId ? { ...b, content: newContent } : b));
                pendingBlockChanges.current[parentId] = {
                    ...(pendingBlockChanges.current[parentId] || {}),
                    content: newContent
                };
                scheduledSync();
            }
        }

        return true;
    }
    


    return (
        <DataContext.Provider value = {{blocks, dataMap, root, updateBlock, addBlock, removeBlock, locations, getLocation, updateLocation, setLocations, syncNow, isSyncing, lastSyncTime}}>
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

