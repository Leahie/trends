import React, {createContext, type ReactNode} from 'react';
import type { BaseBlock, TextBlockType, ImageBlockType, DiaryBlockType  } from '../types';

interface DataContextType {
    boxes: BaseBlock[];
    addText: (value: )
}

// context is created? 
const DataContext = createContext<BaseBlock[] | undefined>(undefined);

// provider component 
export function DataProvider({children} : {children : ReactNode}){
    return (
        <DataContext.Provider value={null}> {children}</DataContext.Provider>
    );
}

