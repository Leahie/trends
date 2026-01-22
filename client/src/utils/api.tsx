import axios, { AxiosError } from 'axios';
import type { Block, Board } from '../types/types';
import { getAuth } from 'firebase/auth';


const API_URL = `${import.meta.env.VITE_API_URL}/data`
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

client.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Failed to get auth token:', error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => response, 
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized - redirecting to login');
      window.location.href = '/login';
    } else if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    }
    return Promise.reject(error);
  }
);

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const api = {
  // fetching the boards 
  async fetchBoards(): Promise<ApiResponse<{ boards: Board[] }>> {
    try {
      const { data } = await client.get('/data/boards');
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // fetching archived boards
  async fetchArchivedBoards(): Promise<ApiResponse<{ boards: Board[] }>> {
    try{
      const { data } = await client.get('/data/boards/archived');
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },
  // fetching a specific board using id 
  async fetchBoard(boardId: string): Promise<ApiResponse<{ board: Board }>> {
    try {
      const { data } = await client.get(`/data/boards/${boardId}`);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // fetching the blocks for a specific board 
  async fetchBlocksFromBoard(boardId: string): Promise<ApiResponse<{ blocks: Block[] }>> {
    try {
      const { data } = await client.get(`/data/boards/${boardId}/blocks`);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // deleting a board 
  async deleteBoard(boardId: string): Promise<ApiResponse<{ 
  boardId: string; 
  deletionId: string; 
  deletedBoardCount: number;
  deletedBlockCount: number;
  boards: string[]; 
  blocks: string[];
}>> {
  try {
    const { data } = await client.delete(`/data/boards/${boardId}`);
    ;
    return { success: true, data };
  } catch (error) {
    ;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Error'
    };
  }
},

  // creating a board 
  async createBoard(title?: string, parentBoardBlockId?: string): Promise<ApiResponse<{ board: Board }>> {
    try {
      
      const { data } = await client.post("/data/boards", { title, parentBoardBlockId });
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // updating a board 
  async updateBoard(boardId: string, updates: Partial<Board>): Promise<ApiResponse<{ board: Board }>> {
    try {
      const { data } = await client.patch(`/data/boards/${boardId}`, updates);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  async fetchBlocks(): Promise<ApiResponse<{blocks: Block[]}>>{
    try {
      const { data } = await client.get(`/data/blocks`);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown Error'
      }
    }
  },
  async fetchBlocksByBoard(): Promise<ApiResponse<{blocksByBoard: Record<string, Block[]>}>> {
    try {
      const { data } = await client.get(`/data/blocks/by-board`);
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching blocks by board:', error);
      return {
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // batch updating blocks 
  async batchUpdateBlocks(updatesArray: Record<string, Partial<Block>>): Promise<ApiResponse<{ updatedBlockIds: string[]; affectedBoards: string[] }>> {
    try {
      ;
      const { data } = await client.patch(`/data/blocks/batch`, updatesArray);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // move blocks to target board (works regardless of current board context)
  async moveBlocks(blockIds: string[], targetBoardId: string | null, offsetX = 0, offsetY = 0): Promise<ApiResponse< {success: true;
      movedBlockIds: string[];
      targetBoardId: string;
      sourceBoardIds: string[];}>>{
      
    try {
      const {data} = await client.post(`/data/blocks/move`, {
        blockIds: blockIds, 
        targetBoardId: targetBoardId, 
        offsetX: offsetX, 
        offsetY: offsetY,
      })
      return {success:true, data}
    } catch (error) {
      return {success: false, error: error instanceof Error? error.message : "Unknown Error"}
    }
  },

  // fetch specific block  
  async fetchBlock(blockId: string): Promise<ApiResponse<{ block: Block }>> {
    try {
      const { data } = await client.get(`/data/blocks/${blockId}`);
      ;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to fetch block:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async updateBlock(blockId: string, updates: Partial<Block>): Promise<ApiResponse<{ block: Block }>> {
    try {
      const { data } = await client.patch(`/data/blocks/${blockId}`, updates);
      return { success: true, data };
    } catch (error) {
      console.error(`Failed to update block ${blockId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update block'
      };
    }
  },

  async addBlock(boardId: string, block: Partial<Block>): Promise<ApiResponse<{ block: Block, board?: Board}>> {
    try {
      ;
      const { data } = await client.post(`/data/boards/${boardId}/blocks`, block);
      ;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to add block:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add block'
      };
    }
  },

  async deleteBlock(blockId: string): Promise<ApiResponse<{ 
    success: true; 
    id: string;
    boards: string[];
    blocks: string[];
}>> {
  try {
    const { data } = await client.delete(`/data/blocks/${blockId}`);
    return { success: true, data };
  } catch (error) {
    console.error(`Failed to delete block ${blockId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete block'
    };
  }
},

  // batch delete blocks
  async batchDeleteBlocks(blockIds: string[]): Promise<ApiResponse<{ 
    deletedBlockIds: string[]; 
    affectedBoards: string[];
    cascadeDeletedBoards: number;
    boards: string[];
    blocks: string[];
  }>> {
    try {
      const { data } = await client.post(`/data/blocks/batch-delete`, { blockIds });
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },
    async batchAddBlocks(boardId: string, blocks: Partial<Block>[]): Promise<ApiResponse<{ blocks: Block[]; boards?: Board[] }>> {
      try {
          ;
          const { data } = await client.post(`/data/boards/${boardId}/blocks/batch`, { blocks });
          ;
          return { success: true, data };
      } catch (error) {
          console.error('Failed to batch add blocks:', error);
          if (axios.isAxiosError(error)) {
              console.error('Response data:', error.response?.data);
              console.error('Response status:', error.response?.status);
          }
          return { 
              success: false, 
              error: error instanceof Error ? error.message : 'Failed to batch add blocks'
          };
      }
  },

  // restore a block
  async restoreBlock(blockId: string): Promise<ApiResponse<{ block: Block }>> {
    try {
      const { data } = await client.post(`/data/blocks/${blockId}/restore`);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // permanently delete a block
  async permanentlyDeleteBlock(blockId: string): Promise<ApiResponse<{ 
    success: true; 
    id: string;
    boards: string[];
    blocks: string[];
  }>> {
    try {
      const { data } = await client.delete(`/data/blocks/${blockId}/permanent`);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // restore a board
  async restoreBoard(boardId: string): Promise<ApiResponse<{ success: true; boardId: string; restoredBlocksCount: number }>> {
    try {
      const { data } = await client.post(`/data/boards/${boardId}/restore`);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // permanently delete a board
  async permanentlyDeleteBoard(boardId: string): Promise<ApiResponse<{ success: true; boardId: string; deletedBlockCount: number }>> {
    try {
      const { data } = await client.delete(`/data/boards/${boardId}/permanent`);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  async pushBlocksToBoard(
    boardId: string, 
    blockIds: string[], 
    targetBoardBlockId: string
  ): Promise<ApiResponse<{
    success: true;
    movedBlockIds: string[];
    targetBoardId: string;
  }>> {
    try {
      const { data } = await client.post(`/data/boards/${boardId}/blocks/push`, {
        blockIds,
        targetBoardBlockId
      });
      return { success: true, data };
    } catch (error) {
      console.error('Failed to push blocks to board:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },


  // cleanup old deleted items
  async cleanup(): Promise<ApiResponse<{ success: true; deletedBoardCount: number; deletedBlockCount: number }>> {
    try {
      const { data } = await client.delete(`/data/cleanup`);
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // USER ROUTES 
  async fetchUserInfo(): Promise<ApiResponse<{role: string; boardLimit: number; pinnedBoards: string[]; checkedHelp: boolean}>>{
    try{
      const {data} = await client.get('/user/info');
      return{
        success: true,
        data
      }
    } catch(error){
    ;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Error'
    };
    }
  },

  async pinBoard(boardId: string): Promise<ApiResponse<{
    success: true;
    boardId: string;
    pinnedBoards: string[];
  }>>{
    try{
      const {data} = await client.post('/user/pins', {boardId})
      return {success: true, data}
    } catch (error) {
      ;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Error'
    };
    }
  },
  async unpinBoard(boardId: string): Promise<ApiResponse<{
  success: true;
  boardId: string;
  pinnedBoards: string[];
}>> {
  try {
    const {data} = await client.delete(`/user/pins/${boardId}`);
    return { success: true, data };
  } catch(error) {
    ;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Error'
    };
  }
},

async reorderPins(pinnedBoards: string[]): Promise<ApiResponse<{
  success: true;
  pinnedBoards: string[];
}>> {
  try {
    const {data} = await client.patch('/user/pins/reorder', { pinnedBoards });
    return { success: true, data };
  } catch(error) {
    ;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Error'
    };
  }
},

async updateCheckedHelp(checkedHelp: boolean): Promise<ApiResponse<{
  success: true;
  checkedHelp: boolean;
}>> {
  try {
    const { data } = await client.patch('/user/checked-help', { checkedHelp });
    return { success: true, data };
  } catch(error) {
    ;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Error'
    };
  }
},


  // generate share link
  async generateShareLink(boardId: string): Promise<ApiResponse<{shareToken: string}>>{
    try {
      const { data } = await client.post(`/data/boards/${boardId}/share`);
      return { success: true, data };
    } catch(error){
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },
  // fetching a specific board using id 
  async fetchSharedBoard(token: string): Promise<ApiResponse<{ board: Board }>> {
    try {
      const response = await fetch(`${API_URL}/boards/shared/${token}`);
      if (!response.ok) {
        throw new Error('Failed to fetch shared board');
      }
      const data = await response.json();
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  //fetch blocks for shared board
  async fetchSharedBoardBlocks(token: string, boardId?: string): Promise<ApiResponse<{ blocks: Block[] }>> {

    const url = boardId
              ? `${API_URL}/boards/shared/${token}/blocks/${boardId}`
              : `${API_URL}/boards/shared/${token}/blocks`
    try {
      // Note: No auth headers for public route
      const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch shared blocks');
    }
    const data = await response.json();
      ;
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  async fetchSharedNestedBoard(token: string, boardId: string): Promise<ApiResponse<{ board: Board }>> {
  try {
    const response = await fetch(`${API_URL}/boards/shared/${token}/nested/${boardId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch nested board');
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Error'
    };
  }
},

  async revokeShareLink(boardId: string): Promise<ApiResponse<{ success: true }>> {
    try {
      const { data } = await client.delete(`/data/boards/${boardId}/share`);
      return { success: true, data };
    } catch (error) {
      ;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },
};