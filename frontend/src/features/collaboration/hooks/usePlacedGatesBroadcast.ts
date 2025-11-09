import { useEffect, useRef } from 'react';
import { useOptionalCollaborationContext } from '@/features/collaboration/CollaborationContext';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';

let isApplyingRemoteUpdate = false;

export function setIsApplyingRemoteUpdate(value: boolean) {
  isApplyingRemoteUpdate = value;
}

export function usePlacedGatesBroadcast() {
  const collaboration = useOptionalCollaborationContext();
  const placedGates = useCircuitStore((state) => state.placedGates);
  const lastBroadcastHashRef = useRef<string>('');
  const broadcastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // skip broadcasting on initial render (hydration)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastBroadcastHashRef.current = JSON.stringify(placedGates.map(g => ({ 
        id: g.id, 
        depth: g.depth,
        ...'gate' in g ? { targetQubits: g.targetQubits } : { startQubit: g.startQubit }
      })));
      return;
    }
    if (!collaboration || isApplyingRemoteUpdate) return;
    // create a lightweight hash of the gates
    const currentHash = JSON.stringify(placedGates.map(g => ({ 
      id: g.id, 
      depth: g.depth,
      ...'gate' in g ? { targetQubits: g.targetQubits } : { startQubit: g.startQubit }
    })));
    // skip if nothing changed
    if (currentHash === lastBroadcastHashRef.current) return;
    lastBroadcastHashRef.current = currentHash;
    // debounce to avoid spamming
    if (broadcastTimeoutRef.current) {
      clearTimeout(broadcastTimeoutRef.current);
    }
    broadcastTimeoutRef.current = setTimeout(() => {
      collaboration.broadcastGateOperation('update', { gates: placedGates });
    }, 150);
    return () => {
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }
    };
  }, [placedGates, collaboration]);
}

