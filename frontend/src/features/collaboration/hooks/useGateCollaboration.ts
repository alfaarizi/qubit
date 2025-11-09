import { useCallback } from 'react';
import { useOptionalCollaborationContext } from '@/features/collaboration/CollaborationContext';
import { useMessageListener } from '@/hooks/useMessageBus';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';
import { setIsApplyingRemoteUpdate } from './usePlacedGatesBroadcast';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';

export function useGateCollaboration() {
  const collaboration = useOptionalCollaborationContext();
  const setPlacedGates = useCircuitStore((state) => state.setPlacedGates);

  // listen for remote gate operations
  useMessageListener(useCallback((message) => {
    if (!collaboration || message.type !== 'gate_op_update') return;
    const { operation, data, connectionId } = message as {
      type: string;
      operation: string;
      data: Record<string, unknown>;
      connectionId: string;
    };
    // skip our own changes
    if (connectionId === collaboration.connectionId) return;
    // apply remote changes without adding to history
    setIsApplyingRemoteUpdate(true);
    switch (operation) {
      case 'update':
        if (data.gates && Array.isArray(data.gates)) {
          setPlacedGates(data.gates as (Gate | Circuit)[], { skipHistory: true });
        }
        break;
    }
    setTimeout(() => {
      setIsApplyingRemoteUpdate(false);
    }, 100);
  }, [collaboration, setPlacedGates]));
}