import axios, { AxiosError } from 'axios';
import type { Block, BlockSizeType } from '../types';

const client = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// client.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized - redirecting to login');
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

interface BatchUpdateResponse {
  success: boolean;
  updated: number;
  failed: string[];
}

export const api = {
  async fetchData(): Promise<ApiResponse<{ blocks: Block[]; locations: Record<string, BlockSizeType> }>> {
    try {
      const { data } = await client.get('/data');
      return { success: true, data };
    } catch (error) {
      console.error('Failed to fetch data:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async updateBlock(blockId: string, updates: Partial<Block>): Promise<ApiResponse<Block>> {
    try {
      const { data } = await client.patch(`/blocks/${blockId}`, updates);
      return { success: true, data };
    } catch (error) {
      console.error(`Failed to update block ${blockId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update block'
      };
    }
  },

  async updateLocation(blockId: string, location: BlockSizeType): Promise<ApiResponse<BlockSizeType>> {
    try {
      const { data } = await client.patch(`/locations/${blockId}`, location);
      return { success: true, data };
    } catch (error) {
      console.error(`Failed to update location ${blockId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update location'
      };
    }
  },


  async batchUpdateLocations(updates: Record<string, BlockSizeType>): Promise<ApiResponse<BatchUpdateResponse>> {
    try {
      const { data } = await client.patch('/locations/batch', updates);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to batch update locations:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to batch update'
      };
    }
  },

  async addBlock(block: Block, location: BlockSizeType): Promise<ApiResponse<{ block: Block; location: BlockSizeType }>> {
    try {
      const { data } = await client.post('/blocks', { block, location });
      return { success: true, data };
    } catch (error) {
      console.error('Failed to add block:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add block'
      };
    }
  },

  // DON'T FORGET TO DELETE LOCATION IN CALL AS WELL
  async deleteBlock(blockId: string): Promise<ApiResponse<{ id: string }>> {
    try {
      const { data } = await client.delete(`/blocks/${blockId}`);
      return { success: true, data };
    } catch (error) {
      console.error(`Failed to delete block ${blockId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete block'
      };
    }
  },
};