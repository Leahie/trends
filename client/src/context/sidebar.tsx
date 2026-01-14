import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/utils/api';

interface SidebarContextType {
  // Session state (localStorage)
  openBoards: Set<string>;
  toggleBoard: (boardId: string) => void;
  openBoard: (boardId: string) => void;
  closeBoard: (boardId: string) => void;
  isOpen: (boardId: string) => boolean;

  // Pinned boards (backend + state)
  pinnedBoards: string[];
  pinBoard: (boardId: string) => Promise<boolean>;
  unpinBoard: (boardId: string) => Promise<boolean>;
  reorderPins: (newOrder: string[]) => Promise<boolean>;
  isPinned: (boardId: string) => boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'sidebar_open_boards';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
    const [openBoards, setOpenBoards] = useState<Set<string>>(new Set());
  const [pinnedBoards, setPinnedBoards] = useState<string[]>([]);

  // Load open boards from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
    try {
        const parsed = JSON.parse(stored);
        console.log("These are the saved data", parsed);
        setOpenBoards(new Set(parsed));
        } catch (error) {
        console.error('Failed to parse open boards from localStorage:', error);
        }
    }
    setHydrated(true);
  }, []);

  // Load pinned boards from backend
  useEffect(() => {
    const loadPinnedBoards = async () => {
      const result = await api.fetchUserInfo();
      if (result.success && result.data) {
        setPinnedBoards(result.data.pinnedBoards || []);
      }
    };
    loadPinnedBoards();
  }, []);

  // Persist open boards to localStorage whenever they change
  useEffect(() => {
    if (!hydrated) return;

    console.log("I SAVED TO MY LOCAL STORAGE", Array.from(openBoards));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(openBoards)));
    }, [openBoards, hydrated]);

  const toggleBoard = useCallback((boardId: string) => {
    setOpenBoards(prev => {
      const next = new Set(prev);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  }, []);

  const openBoard = useCallback((boardId: string) => {
    setOpenBoards(prev => new Set(prev).add(boardId));
  }, []);

  const closeBoard = useCallback((boardId: string) => {
    setOpenBoards(prev => {
      const next = new Set(prev);
      next.delete(boardId);
      return next;
    });
  }, []);

  const isOpen = useCallback((boardId: string) => {
    return openBoards.has(boardId);
  }, [openBoards]);

  const pinBoard = useCallback(async (boardId: string): Promise<boolean> => {
    const result = await api.pinBoard(boardId);
    if (result.success && result.data) {
      setPinnedBoards(result.data.pinnedBoards);
      return true;
    }
    return false;
  }, []);

  const unpinBoard = useCallback(async (boardId: string): Promise<boolean> => {
    const result = await api.unpinBoard(boardId);
    if (result.success && result.data) {
      setPinnedBoards(result.data.pinnedBoards);
      return true;
    }
    return false;
  }, []);

  const reorderPins = useCallback(async (newOrder: string[]): Promise<boolean> => {
    // Optimistic update
    setPinnedBoards(newOrder);
    
    const result = await api.reorderPins(newOrder);
    if (!result.success) {
      // Rollback on failure
      const userInfo = await api.fetchUserInfo();
      if (userInfo.success && userInfo.data) {
        setPinnedBoards(userInfo.data.pinnedBoards);
      }
      return false;
    }
    return true;
  }, []);

  const isPinned = useCallback((boardId: string) => {
    return pinnedBoards.includes(boardId);
  }, [pinnedBoards]);

  return (
    <SidebarContext.Provider value={{
      openBoards,
      toggleBoard,
      openBoard,
      closeBoard,
      isOpen,
      pinnedBoards,
      pinBoard,
      unpinBoard,
      reorderPins,
      isPinned
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}