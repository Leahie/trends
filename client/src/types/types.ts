// Convention: 
// - Everything that ends in Block represents a block within my code
// - Everything that ends in Board represents a board 
// - Everything that ends in Size represents the sizing

export interface Board{
    id: string; 
    userId: string; 
    title: string;
    colorscheme: Theme; 
    parentBoardBlockId: string | null;
    readonly createdAt: Date | null;
    readonly updatedAt: Date | null;
    readonly deletedAt: Date | null;
    readonly deletionId?: string | null;
}

export type BlockType = "text" | "image" | "board_block"

export interface BaseBlock{
    id: string;
    type: BlockType; 
    boardId: string;
    userId: string;
    location: Location;
    content: Record<string, any>;
    linkedBoardId: string | null;
    readonly deletedAt: Date | null;
    readonly deletionId?: string | null;
    readonly createdAt: Date | null;
    readonly updatedAt: Date | null;
}


export interface TextBlockType extends BaseBlock{
    type: "text"; 
    content: {
        title: string;
        body: string;
        bgColor?: string;
    }
}

export interface ImageBlockType extends BaseBlock{
    type: "image";
    content: {
        title: string; 
        url: string; 
        source: 'upload' | 'external';
        transforms?: ImageTransforms;
        imgWidth: number;
        imgHeight: number;
        subtitle?: boolean;
    }
}

export interface BoardBlockType extends BaseBlock{
    type: "board_block";
    linkedBoardId: string | null;
    content: {
        title: string;
        
    }
}
export interface Theme {
    black: string,
    dark: string,
    highlight: string,
    accent: string,
    "light-accent": string,
    white: string,
    "light-hover": string,
}

export interface Location {
    x: number;
    y: number;
    width:  number;
    height: number;
    zIndex: number;
    rotation: number;
    scaleX: number; 
    scaleY: number;
}

export type Block =  TextBlockType | ImageBlockType | BoardBlockType;

export interface ImageTransforms {
  crop?: {
    xRatio: number;
    yRatio: number;
    widthRatio: number;
    heightRatio: number;
  };
  flip?: {
    horizontal: boolean;
    vertical: boolean;
  };
  rotation?: number; // degrees
  grayscale?: boolean;
  opacity?: number; // 0-1
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
}