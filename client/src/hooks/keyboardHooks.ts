import { useEffect, useRef } from 'react';
import { useEditor } from '@/context/editor';
import { useData } from '@/context/data';
import { useAuth } from '@/context/auth';

import { uploadToFirebase } from "@/hooks/uploadToFirebase.ts";
import type { Block } from '@/types/types';
import { useSidebar } from '@/context/sidebar';


interface KeyboardShortcutsProps {
  onToggleSidebar?: () => void;
  getCurrentCanvasPosition?: () => { x: number; y: number; parentId: string };
  pan: {x: number, y:number}; 
  scale: number;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export function useKeyboardShortcuts({ onToggleSidebar, getCurrentCanvasPosition, pan, scale, canvasRef }: KeyboardShortcutsProps ) {
  const { selectedBlockIds, copyBlocks, clearSelection, undo, redo, isEditingText, pasteBlocks, cutBlocks, 
    pushToHistory, clipboard
  } = useEditor();

  const { dataMap, addBlock, batchDeleteBlocks, currentBoard, closeBoardForSidebar} = useData();
  const lastCursorPos = useRef({ x: 0, y: 0 });
  const {getIdToken} = useAuth();
  const lastBlockCopyTime = useRef<number>(0);

  const screenToCanvas = (clientX: number, clientY: number) => {
    const canvas = canvasRef?.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    return {
      x: (mouseX - pan.x) / scale,
      y: (mouseY - pan.y) / scale
    };
  };

  // Keyboard shortcuts effect
  useEffect(() => {
    if (!canvasRef?.current) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Delete selected blocks (Backspace or Delete)
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedBlockIds.length > 0 && !isEditingText) {
          e.preventDefault();
          const before: Record<string, any> = {};
          selectedBlockIds.forEach(id => {
            closeBoardForSidebar(id)
            const block = dataMap[id];
            if (block) before[id] = structuredClone(block);
          });
          
          ;
          await batchDeleteBlocks(selectedBlockIds);
          pushToHistory(before, {});
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
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !isEditingText) {
        e.preventDefault();
        if (onToggleSidebar) {
          onToggleSidebar();
        }
        return;
      }
    };

    // 

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasRef, selectedBlockIds, isEditingText, batchDeleteBlocks, clearSelection, undo, redo, onToggleSidebar, pushToHistory, dataMap]);

  // Copy/paste/cut effect
  useEffect(() => {
    if (isEditingText) return;

    const handleCopy = async (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return; // Native copy
      }

      if (selectedBlockIds.length > 0) {
        e.preventDefault();
        copyBlocks(selectedBlockIds);
        lastBlockCopyTime.current = Date.now();
        
        // Add a marker to clipboard so we can detect block copies
        try {
          e.clipboardData?.setData('text/plain', `__BLOCKS_COPIED_${lastBlockCopyTime.current}__`);
        } catch (err) {
          console.warn('Could not set clipboard data:', err);
        }
      }
    };

    const handleCut = async (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return; // Native cut
      }

      if (selectedBlockIds.length > 0) {
        e.preventDefault();
        await cutBlocks(selectedBlockIds);
        lastBlockCopyTime.current = Date.now();
        
        try {
          e.clipboardData?.setData('text/plain', `__BLOCKS_COPIED_${lastBlockCopyTime.current}__`);
        } catch (err) {
          console.warn('Could not set clipboard data:', err);
        }
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (!currentBoard) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const text = e.clipboardData?.getData('text/plain');
      const blockMarkerMatch = text?.match(/__BLOCKS_COPIED_(\d+)__/);

      if (blockMarkerMatch) {
        const clipboardTimestamp = parseInt(blockMarkerMatch[1], 10);
        
        // If we have blocks in our internal clipboard and the timestamp matches (or is close),
        // paste blocks instead of clipboard content
        if (clipboard.length > 0 && Math.abs(clipboardTimestamp - lastBlockCopyTime.current) < 1000) {
          e.preventDefault();
          
          let canvasX = lastCursorPos.current.x;
          let canvasY = lastCursorPos.current.y;

          if (getCurrentCanvasPosition) {
            const pos = getCurrentCanvasPosition();
            canvasX = pos.x;
            canvasY = pos.y;
          }

          await pasteBlocks(canvasX, canvasY, currentBoard.id);
          return;
        }
      }

      // Check for images first
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();
          if (!file) continue;

          // Get paste position
          let canvasX = lastCursorPos.current.x;
          let canvasY = lastCursorPos.current.y;

          if (getCurrentCanvasPosition) {
            const pos = getCurrentCanvasPosition();
            canvasX = pos.x;
            canvasY = pos.y;
          }

          // Upload image and create block
          const token = await getIdToken();
          if (!token) continue;

          const firebaseUrl = await uploadToFirebase({ file, token });
          if (!firebaseUrl) continue;

          const img = new Image();
          const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = reject;
            img.src = firebaseUrl;
          });

          const maxZ = Math.max(...Object.values(dataMap).map(b => b.location.zIndex), 0);

          const partial: Partial<Block> = {
            type: 'image',
            boardId: currentBoard.id,
            content: {
              title: "Pasted Image",
              url: firebaseUrl,
              source: 'external',
              imgWidth: dimensions.width,
              imgHeight: dimensions.height
            },
            location: {
              x: canvasX,
              y: canvasY,
              width: dimensions.width,
              height: dimensions.height,
              zIndex: maxZ + 1,
              rotation: 0,
              scaleX: 1,
              scaleY: 1
            }
          };

          const result = await addBlock(partial);
          if (result) pushToHistory({}, {[result.id]: result});

          return;
        }
      }

      if (text && text.trim() && !blockMarkerMatch) {
        // Check if this looks like a URL
        const urlPattern = /^https?:\/\/.+/;
        if (urlPattern.test(text.trim())) {
          e.preventDefault();

          let canvasX = lastCursorPos.current.x;
          let canvasY = lastCursorPos.current.y;

          if (getCurrentCanvasPosition) {
            const pos = getCurrentCanvasPosition();
            canvasX = pos.x;
            canvasY = pos.y;
          }

          const maxZ = Math.max(...Object.values(dataMap).map(b => b.location.zIndex), 0);

          const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
          if (imageExtensions.test(text)) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
              img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
              img.onerror = () => resolve({ width: 400, height: 300 });
              img.src = text;
            });

            await addBlock({
              type: 'image',
              boardId: currentBoard.id,
              content: {
                title: "Pasted Image URL",
                url: text,
                source: 'external',
                imgWidth: dimensions.width,
                imgHeight: dimensions.height
              },
              location: {
                x: canvasX,
                y: canvasY,
                width: dimensions.width,
                height: dimensions.height,
                zIndex: maxZ + 1,
                rotation: 0,
                scaleX: 1,
                scaleY: 1
              }
            });
          } else {
            await addBlock({
              type: 'text',
              boardId: currentBoard.id,
              content: {
                title: "Pasted Text",
                body: text
              },
              location: {
                x: canvasX,
                y: canvasY,
                width: 300,
                height: 150,
                zIndex: maxZ + 1,
                rotation: 0,
                scaleX: 1,
                scaleY: 1
              }
            });
          }

          return;
        }
      }

      if (clipboard.length > 0) {
        e.preventDefault();

        let canvasX = lastCursorPos.current.x;
        let canvasY = lastCursorPos.current.y;

        if (getCurrentCanvasPosition) {
          const pos = getCurrentCanvasPosition();
          canvasX = pos.x;
          canvasY = pos.y;
        }

        await pasteBlocks(canvasX, canvasY, currentBoard.id);
      }
    };

    // Track mouse position for paste location
    const handleMouseMove = (e: MouseEvent) => {
      lastCursorPos.current = screenToCanvas(e.clientX, e.clientY);
    };
    
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [
    selectedBlockIds,
    isEditingText,
    clearSelection,
    batchDeleteBlocks,
    copyBlocks,
    cutBlocks,
    pasteBlocks,
    clipboard,
    currentBoard,
    dataMap,
    addBlock,
    pushToHistory,
    getIdToken,
    getCurrentCanvasPosition,
    pan,
    scale
  ]);
}

// Separate component that can be mounted in your canvas
export function KeyboardShortcuts(props: KeyboardShortcutsProps) {
  useKeyboardShortcuts(props);
  return null;
}