import { View } from "lucide-react";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

interface ViewModeContextType {
    readOnly: boolean;
}

const ViewModeContext = createContext<ViewModeContextType>({readOnly: true});

export function ViewModeProvider({
    children,
    readOnly = true
}: {
    children: ReactNode;
    readOnly?: boolean;
}){
    return(
        <ViewModeContext.Provider value={{readOnly}}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode(){
    return useContext(ViewModeContext);
}