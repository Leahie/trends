// Convention: 
// - Everything that ends in Block represents a block within my code
// - Everything that ends in Size represents the sizing

export type BlockType = "base_page" | "text" | "image" | "diary_entry"

export interface BaseBlock{
    id: string;
    type: BlockType; 
    properties: Record<string, any>;
    parent: string;
}

export interface BasePageBlock extends BaseBlock{
    type: "base_page";
    properties: {
        title: string;
    };
    content: string[];
}

export interface TextBlock extends BaseBlock{
    type: "text"; 
    properties: {
        title: string;
        body: string;
    }
}

export interface ImageBlock extends BaseBlock{
    type: "image";
    properties: {
        title: string; 
        url: string; 
    }
}

export interface DiaryBlock extends BaseBlock{
    type: "diary_entry";
    properties: {
        title: string;
    }
    content: string[];
}

export interface BlockSize {
    x: number;
    y: number;
    width:  number;
    height: number;
    zIndex: number;
}


export type Block = BasePageBlock | TextBlock | ImageBlock | DiaryBlock;