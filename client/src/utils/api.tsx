import axios, { AxiosError } from 'axios';
import type { Block, Board } from '../types/types';
import { getAuth } from 'firebase/auth';

const client = axios.create({
  baseURL: 'http://localhost:5000/api',
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
        console.log("token", token);
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
      console.log("This is the boards", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to fetch boards:', error);
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
      console.log("This is the archived boards", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to fetch archived boards:', error);
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
      console.log(`This is the data for board ${boardId}`, data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to fetch board:', error);
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
      console.log(`This is the blocks for board ${boardId}`, data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to fetch blocks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // deleting a board 
  async deleteBoard(boardId: string): Promise<ApiResponse<{ boardId: string; deletionId: string; deletedBlockCount: number }>> {
    try {
      const { data } = await client.delete(`/data/boards/${boardId}`);
      console.log(`This is the board deletion data`, data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to delete board:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // creating a board 
  async createBoard(title?: string): Promise<ApiResponse<{ board: Board }>> {
    try {
      console.log("This is the title", title)
      const { data } = await client.post("/data/boards", { title });
      console.log("This is the newly created board", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to create board:', error);
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
      console.log("This is the newly updated board data", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to update board:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // batch updating blocks 
  async batchUpdateBlocks(updatesArray: Record<string, Partial<Block>>): Promise<ApiResponse<{ updatedBlockIds: string[]; affectedBoards: string[] }>> {
    try {
      console.log("This is the batch array", updatesArray);
      const { data } = await client.patch(`/data/blocks/batch`, updatesArray);
      console.log("This is the batch update response", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to batch update blocks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // duplicate a block
  async duplicateBlock(blockId: string, targetBoardId?: string, offsetX?: number, offsetY?: number): Promise<ApiResponse<{ block: Block }>> {
    try {
      const { data } = await client.post(`/data/blocks/${blockId}/duplicate`, {
        targetBoardId,
        offsetX,
        offsetY
      });
      console.log("Duplicated block", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to duplicate block:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // fetch specific block  
  async fetchBlock(blockId: string): Promise<ApiResponse<{ block: Block }>> {
    try {
      const { data } = await client.get(`/data/blocks/${blockId}`);
      console.log("This is the block", data);
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

  async addBlock(boardId: string, block: Partial<Block>): Promise<ApiResponse<{ block: Block }>> {
    try {
      console.log('Attempting to add block to board:', boardId);
      const { data } = await client.post(`/data/boards/${boardId}/blocks`, block);
      console.log('Block added successfully:', data);
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

  async deleteBlock(blockId: string): Promise<ApiResponse<{ success: true; id: string }>> {
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
  async batchDeleteBlocks(blockIds: string[]): Promise<ApiResponse<{ deletedBlockIds: string[]; affectedBoards: string[] }>> {
    try {
      const { data } = await client.post(`/data/blocks/batch-delete`, { blockIds });
      console.log("Batch deleted blocks", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to batch delete blocks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // restore a block
  async restoreBlock(blockId: string): Promise<ApiResponse<{ block: Block }>> {
    try {
      const { data } = await client.post(`/data/blocks/${blockId}/restore`);
      console.log("Restored block", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to restore block:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },

  // permanently delete a block
  async permanentlyDeleteBlock(blockId: string): Promise<ApiResponse<{ success: true; id: string }>> {
    try {
      const { data } = await client.delete(`/data/blocks/${blockId}/permanent`);
      console.log("Permanently deleted block", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to permanently delete block:', error);
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
      console.log("Restored board", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to restore board:', error);
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
      console.log("Permanently deleted board", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to permanently delete board:', error);
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
      console.log("Cleanup completed", data);
      return { success: true, data };
    } catch (error) {
      console.log('Failed to cleanup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Error'
      };
    }
  },
};