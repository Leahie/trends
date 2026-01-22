import type { Board } from "./types";

// a basic node contains
export interface Node {
    id: string, // this is the board id
    children: Board[], // prolly a thousand problems with this T-T

    // UI state
    collapsed?: boolean; 
    hidden?: boolean; 
}

export interface BoardTree {
    nodes: Record<string, Node>;
    rootOrder: string[]; // order of roots

}