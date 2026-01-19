import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/utils/api';
import { useAuth } from './auth';

interface SidebarContextType {
  // toggle logic 
  open: boolean; 
  toggleOpen: () => void;

  // Session state (localStorage)
  openBoards: Set<string>;
  toggleBoard: (boardId: string) => void;
  openBoard: (boardId: string) => void;
  closeBoard: (boardId: string) => void;
  isOpen: (boardId: string) => boolean;
  clearOpenBoards: () => void;
  pruneOpenBoards: (validBoardIds: string[]) => void;

  // Pinned boards (backend + state)
  pinnedBoards: string[];
  pinBoard: (boardId: string) => Promise<boolean>;
  unpinBoard: (boardId: string) => Promise<boolean>;
  reorderPins: (newOrder: string[]) => Promise<boolean>;
  isPinned: (boardId: string) => boolean;

  // Board management
  addNewRootBoard: (boardId: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'sidebar_open_boards';
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

export function SidebarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);
  const [openBoards, setOpenBoards] = useState<Set<string>>(new Set());
  const [pinnedBoards, setPinnedBoards] = useState<string[]>([]);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Clear localStorage when user logs out or changes (only on actual transitions)
  useEffect(() => {
    if (!user && lastUserId) {
      // User logged out (transition from having userId to no user)
      setOpenBoards(new Set());
      localStorage.removeItem(STORAGE_KEY);
      setLastUserId(null);
    } else if (user && lastUserId && lastUserId !== user.uid) {
      // User switched accounts (userId changed)
      setOpenBoards(new Set());
      localStorage.removeItem(STORAGE_KEY);
      setLastUserId(user.uid);
    } else if (user && !lastUserId) {
      // First login
      setLastUserId(user.uid);
    }
  }, [user, lastUserId]);

  // Load open boards from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        const isExpired =
          !parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS;

        if (isExpired) {
          ;
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setOpenBoards(new Set(parsed.value || []));
        } 
      } catch (error) {
        console.error('Failed to parse open boards from localStorage:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  // Load pinned boards from backend (only when user is authenticated)
  useEffect(() => {
    if (!user) return; // Skip if not authenticated
    
    const loadPinnedBoards = async () => {
      const result = await api.fetchUserInfo();
      if (result.success && result.data) {
        setPinnedBoards(result.data.pinnedBoards || []);
      }
    };
    loadPinnedBoards();
  }, [user]);

  // Persist open boards to localStorage whenever they change
  useEffect(() => {
    if (!hydrated) return;

    const payload = {
      value: Array.from(openBoards),
      savedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [openBoards, hydrated]);

  const toggleOpen = () => {
    setOpen((prev) => !prev);
  };

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

  const clearOpenBoards = useCallback(() => {
    setOpenBoards(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const pruneOpenBoards = useCallback((validBoardIds: string[]) => {
    const validSet = new Set(validBoardIds);

    setOpenBoards(prev => {
      let changed = false;
      const next = new Set<string>();

      prev.forEach(id => {
        if (validSet.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, []);

  const addNewRootBoard = useCallback((boardId: string) => {
    setOpenBoards(prev => new Set(prev).add(boardId));
  }, []);

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
      open, 
      toggleOpen,
      openBoards,
      toggleBoard,
      openBoard,
      closeBoard,
      isOpen,
      clearOpenBoards,
      pruneOpenBoards,
      pinnedBoards,
      pinBoard,
      unpinBoard,
      reorderPins,
      isPinned,
      addNewRootBoard
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