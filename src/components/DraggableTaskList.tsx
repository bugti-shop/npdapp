import { useState, useRef, useCallback, useEffect } from 'react';
import { TodoItem } from '@/types/note';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { cn } from '@/lib/utils';

interface DraggableTaskListProps {
  items: TodoItem[];
  onReorder: (reorderedItems: TodoItem[]) => void;
  renderItem: (item: TodoItem, isDragging: boolean, isDropTarget: boolean) => React.ReactNode;
  className?: string;
}

const LONG_PRESS_DELAY = 300;

export const DraggableTaskList = ({ 
  items, 
  onReorder, 
  renderItem,
  className 
}: DraggableTaskListProps) => {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedId: string | null;
    draggedIndex: number | null;
    dropTargetIndex: number | null;
    translateY: number;
    startY: number;
  }>({
    isDragging: false,
    draggedId: null,
    draggedIndex: null,
    dropTargetIndex: null,
    translateY: 0,
    startY: 0,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((item: TodoItem, index: number, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    hasMovedRef.current = false;

    longPressTimerRef.current = setTimeout(async () => {
      if (!hasMovedRef.current) {
        try {
          await Haptics.impact({ style: ImpactStyle.Medium });
        } catch {}

        setDragState({
          isDragging: true,
          draggedId: item.id,
          draggedIndex: index,
          dropTargetIndex: index,
          translateY: 0,
          startY: touch.clientY,
        });
      }
    }, LONG_PRESS_DELAY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // If moved more than 10px before long press, cancel
    if (!dragState.isDragging && (deltaX > 10 || deltaY > 10)) {
      hasMovedRef.current = true;
      clearLongPressTimer();
      return;
    }

    if (dragState.isDragging) {
      e.preventDefault();
      e.stopPropagation();
      
      const translateY = touch.clientY - dragState.startY;
      
      // Find which item we're hovering over
      let newDropTargetIndex = dragState.draggedIndex;
      itemRefs.current.forEach((ref, id) => {
        if (id === dragState.draggedId) return;
        const rect = ref.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const itemIndex = items.findIndex(item => item.id === id);
        
        if (touch.clientY > rect.top && touch.clientY < rect.bottom) {
          if (touch.clientY < itemCenter) {
            newDropTargetIndex = itemIndex;
          } else {
            newDropTargetIndex = itemIndex + 1;
          }
        }
      });

      // Haptic feedback when crossing item boundaries
      if (newDropTargetIndex !== dragState.dropTargetIndex) {
        try {
          Haptics.impact({ style: ImpactStyle.Light });
        } catch {}
      }

      setDragState(prev => ({
        ...prev,
        translateY,
        dropTargetIndex: newDropTargetIndex,
      }));
    }
  }, [dragState, items, clearLongPressTimer]);

  const handleTouchEnd = useCallback(() => {
    clearLongPressTimer();

    if (dragState.isDragging && dragState.draggedIndex !== null && dragState.dropTargetIndex !== null) {
      const fromIndex = dragState.draggedIndex;
      let toIndex = dragState.dropTargetIndex;
      
      if (fromIndex !== toIndex) {
        // Adjust toIndex if moving downward
        if (toIndex > fromIndex) {
          toIndex = toIndex - 1;
        }
        
        const newItems = [...items];
        const [movedItem] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, movedItem);
        
        try {
          Haptics.impact({ style: ImpactStyle.Heavy });
        } catch {}
        
        onReorder(newItems);
      }
    }

    setDragState({
      isDragging: false,
      draggedId: null,
      draggedIndex: null,
      dropTargetIndex: null,
      translateY: 0,
      startY: 0,
    });
  }, [dragState, items, onReorder, clearLongPressTimer]);

  // Add touch cancel handler
  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    setDragState({
      isDragging: false,
      draggedId: null,
      draggedIndex: null,
      dropTargetIndex: null,
      translateY: 0,
      startY: 0,
    });
  }, [clearLongPressTimer]);

  // Prevent context menu on long press
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventContextMenu = (e: Event) => {
      if (dragState.isDragging) {
        e.preventDefault();
      }
    };

    container.addEventListener('contextmenu', preventContextMenu);
    return () => {
      container.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [dragState.isDragging]);

  const setItemRef = useCallback((id: string, ref: HTMLDivElement | null) => {
    if (ref) {
      itemRefs.current.set(id, ref);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn("relative", className)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{ 
        touchAction: dragState.isDragging ? 'none' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {items.map((item, index) => {
        const isDragging = dragState.draggedId === item.id;
        const isDropTarget = !isDragging && 
          dragState.isDragging && 
          dragState.dropTargetIndex !== null &&
          (index === dragState.dropTargetIndex || 
           (index === items.length - 1 && dragState.dropTargetIndex > items.length - 1));
        
        return (
          <div
            key={item.id}
            ref={(ref) => setItemRef(item.id, ref)}
            className={cn(
              "relative transition-transform",
              isDragging && "z-50 opacity-90 scale-[1.02] shadow-lg",
              isDropTarget && "before:absolute before:inset-x-0 before:-top-0.5 before:h-1 before:bg-primary before:rounded-full"
            )}
            style={{
              transform: isDragging ? `translateY(${dragState.translateY}px)` : undefined,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
            onTouchStart={(e) => handleTouchStart(item, index, e)}
          >
            {renderItem(item, isDragging, isDropTarget)}
          </div>
        );
      })}
    </div>
  );
};