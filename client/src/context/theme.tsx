import React, {useContext, createContext, useState, type ReactNode, useEffect} from 'react';
import type { Theme } from '../types';
import { useColorScheme } from '../utils/theme';

interface ThemeContextType {
    theme: Theme;
    updateTheme: (newTheme:Theme) => void;
    resetTheme: () => void;
}

const defaultTheme: Theme = {
        black: "#141613",
        dark: "#2C302B",
        highlight: "#596157",
        accent: "#6C816F",
        "light-accent": "#90A694",
        white: "#F5F1ED",
        "light-hover" : "#D8D8D8"
    };

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({children}: {children : ReactNode}){
    const [theme, setTheme] = useState<Theme>(
        {black: "#343135",
        dark: "#444444",
        highlight: "#596157",
        accent: "#6C816F",
        "light-accent": "#90A694",
        white: "#F5F1ED",
        "light-hover" : "#D8D8D8"
    });
        console.log("theme", theme);


    const updateTheme = (newTheme:Theme) => {
        setTheme(newTheme);
    }

    const resetTheme = () => {
        setTheme(defaultTheme);
    };

    // on load use the roots theme?

    useEffect(() => {
        const root = document.documentElement;
        const colors = useColorScheme(theme);
        Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(key, value);
        });
  }, [theme]);

    return <ThemeContext.Provider value = {{theme, updateTheme, resetTheme}}>
        {children}
    </ThemeContext.Provider>
}

export function useTheme(){
    const context = useContext(ThemeContext);
        if (context === undefined) {
            throw new Error("useData must be used within a DataProvider")
        }
        return context;
}