import { useEffect, useRef, useCallback } from 'react';
import { CircuitCanvas } from './CircuitCanvas';
import { CollaboratorCursors } from '@/components/common/CollaboratorCursors';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CollaborativeCircuitCanvasProps {
  circuitId: string;
  onCursorMove?: (x: number, y: number) => void;
  onGateSelect?: (gateIds: string[]) => void;
}

export function CollaborativeCircuitCanvas({
  circuitId,
  onCursorMove,
  onGateSelect,
}: CollaborativeCircuitCanvasProps) {
  const canEdit = useCollaborationStore(state => state.canEdit());
  const placedGates = useCircuitStore(state => state.placedGates);
  const isGateLocked = useCollaborationStore(state => state.isGateLocked);
  const getGateLock = useCollaborationStore(state => state.getGateLock);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const cursorThrottleRef = useRef<number | null>(null);

  // track cursor movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!onCursorMove || !canvasRef.current) return;

    // throttle cursor updates to 60fps
    if (cursorThrottleRef.current) return;

    cursorThrottleRef.current = window.setTimeout(() => {
      cursorThrottleRef.current = null;
    }, 16);

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    onCursorMove(x, y);
  }, [onCursorMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousemove', handleMouseMove);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, [handleMouseMove]);

  // prevent edit actions if user doesn't have permission
  useEffect(() => {
    if (!canEdit) {
      const preventAction = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        toast.error('You only have view access to this project');
      };

      const canvas = canvasRef.current;
      if (!canvas) return;

      // prevent drag and drop
      canvas.addEventListener('dragstart', preventAction, true);
      canvas.addEventListener('drop', preventAction, true);

      return () => {
        canvas.removeEventListener('dragstart', preventAction, true);
        canvas.removeEventListener('drop', preventAction, true);
      };
    }
  }, [canEdit]);

  return (
    <div ref={canvasRef} className="relative">
      <CircuitCanvas />
      <CollaboratorCursors circuitId={circuitId} />
      
      {/* locked gate overlays */}
      {placedGates.map(gate => {
        if (!isGateLocked(gate.id)) return null;
        const lock = getGateLock(gate.id);
        if (!lock) return null;

        return (
          <div
            key={`lock-${gate.id}`}
            className={cn(
              "absolute pointer-events-none z-40 border-2 rounded-md",
              "animate-pulse"
            )}
            style={{
              borderColor: lock.color,
              boxShadow: `0 0 10px ${lock.color}50`,
            }}
          >
            <Badge
              className="absolute -top-6 left-0 text-white border-0 shadow-md"
              style={{ backgroundColor: lock.color }}
            >
              {lock.userName} is editing
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

