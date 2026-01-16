import { useEffect, useRef } from 'react';
import { useEditor } from '@/context/editor';
import { useData } from '@/context/data';

interface KeyboardShortcutsProps {
  onToggleSidebar?: () => void;
  getCurrentCanvasPosition?: () => { x: number; y: number; parentId: string };

}

export function useKeyboardShortcuts({ onToggleSidebar, getCurrentCanvasPosition  }: KeyboardShortcutsProps = {}) {
  const { selectedBlockIds, copyBlocks, clearSelection, undo, redo, isEditingText, pasteBlocks, cutBlocks } = useEditor();
  const { batchDeleteBlocks,  currentBoard} = useData();
  const lastCursorPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger shortcuts when editing text
      if (isEditingText) {
        // Allow Escape to exit text editing
        if (e.key === 'Escape') {
          clearSelection();
        }
        return;
      }

      // Copy (Ctrl+C or Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          copyBlocks(selectedBlockIds);
        }
        return;
      }

      // Cut (Ctrl+X or Cmd+X)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          await cutBlocks(selectedBlockIds);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        
        if (!currentBoard) return;

        let canvasX = lastCursorPos.current.x;
        let canvasY = lastCursorPos.current.y;

        // Try to get current cursor position
        if (getCurrentCanvasPosition) {
          const pos = getCurrentCanvasPosition();
          canvasX = pos.x;
          canvasY = pos.y;
        }

        await pasteBlocks(canvasX, canvasY, currentBoard.id);
        return;
      }

      // Delete selected blocks (Backspace or Delete)
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          await batchDeleteBlocks(selectedBlockIds);
          clearSelection();
        }
        return;
      }

      // Clear selection (Escape)
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Undo (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        await undo();
        return;
      }

      // Redo (Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z)
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        await redo();
        return;
      }

      // Toggle sidebar (Tab)
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        if (onToggleSidebar) {
          onToggleSidebar();
        }
        return;
      }
    };

    // Track mouse position for paste location
    const handleMouseMove = (e: MouseEvent) => {
      lastCursorPos.current = { x: e.clientX, y: e.clientY };
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedBlockIds,
    isEditingText,
    clearSelection,
    batchDeleteBlocks,
    undo,
    redo,
    onToggleSidebar
  ]);
}

// Separate component that can be mounted in your canvas
export function KeyboardShortcuts({ onToggleSidebar }: KeyboardShortcutsProps) {
  useKeyboardShortcuts({ onToggleSidebar });
  return null;
}