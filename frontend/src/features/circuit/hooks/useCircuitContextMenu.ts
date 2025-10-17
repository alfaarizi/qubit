import { useCallback } from 'react';
import type { Gate } from '@/features/gates/types';

export function useCircuitContextMenu() {
    const handleEditGate = useCallback((gate: Gate) => {
        console.log('Edit gate:', gate);
        // TODO: Open gate editor dialog
    }, []);

    const handleCreateCircuit = useCallback((gateIds: Set<string>) => {
        console.log('Create circuit from gates:', Array.from(gateIds));
        // TODO: Implement circuit creation logic
    }, []);

    return {
        handleEditGate,
        handleCreateCircuit,
    };
}
