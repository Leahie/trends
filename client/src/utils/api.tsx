import axios, { AxiosError } from 'axios';
import type { Block, BlockSizeType } from '../types';
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
        console.log("token",token)
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

interface BatchUpdateResponse {
  success: boolean;
  updated: number;
  failed: string[];
}

export const api = {
  async fetchData(): Promise<ApiResponse<{ blocks: Block[]; locations: Record<string, BlockSizeType> }>> {
    try {
      const { data } = await client.get('/data');
      console.log("This is the data", data);
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

  async updateLocation(blockId: string, location: BlockSizeType): Promise<ApiResponse<BlockSizeType>> {
    try {
      const { data } = await client.patch(`/data/locations/${blockId}`, location);
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
      const { data } = await client.patch('/data/locations/batch', updates);
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
      console.log('Attempting to add block:', block.id);
      const { data } = await client.post('/data/blocks', { block, location });
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


  // DON'T FORGET TO DELETE LOCATION IN CALL AS WELL
  async deleteBlock(blockId: string): Promise<ApiResponse<{ id: string }>> {
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
};

