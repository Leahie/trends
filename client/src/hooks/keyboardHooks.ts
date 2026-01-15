import { useEffect } from 'react';
import { useEditor } from '@/context/editor';
import { useData } from '@/context/data';

interface KeyboardShortcutsProps {
  onToggleSidebar?: () => void;
}

export function useKeyboardShortcuts({ onToggleSidebar }: KeyboardShortcutsProps = {}) {
  const { selectedBlockIds, clearSelection, undo, redo, isEditingText } = useEditor();
  const { batchDeleteBlocks } = useData();

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