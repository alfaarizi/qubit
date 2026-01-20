import { useEffect, startTransition } from 'react';

import { useCircuitDAG } from '@/features/circuit/hooks/useCircuitDAG';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';
import type { Circuit } from '@/features/circuit/types';
import type { Gate } from '@/features/gates/types';
import { deserializeGateFromAPI } from '@/lib/api/circuits';
import type { Job, SerializedGate } from '@/types';

const IMPORT_BATCH_SIZE = 100;

export function useImportedCircuit(
    job: Job | undefined,
    filenameRef: React.RefObject<string | null>
): void {
    const setNumQubits = useCircuitStore((state) => state.setNumQubits);
    const setMeasurements = useCircuitStore((state) => state.setMeasurements);
    const setPlacedGates = useCircuitStore((state) => state.setPlacedGates);
    const setTags = useCircuitStore((state) => state.setTags);
    const { batchInjectGates } = useCircuitDAG();

    useEffect(() => {
        if (!job || job.jobType !== 'import' || job.status !== 'complete') return;

        const completeUpdate = job.updates.find(u => u.type === 'complete');
        const result = completeUpdate?.result;
        if (!result || typeof result.num_qubits !== 'number' || !Array.isArray(result.placed_gates)) return;

        async function constructCircuit(): Promise<void> {
            const numQubits = result!.num_qubits as number;
            const rawGates = result!.placed_gates as unknown[];

            setNumQubits(numQubits);
            setMeasurements(Array(numQubits).fill(true));
            setPlacedGates([], { skipHistory: true });

            if (filenameRef.current) {
                setTags([`Imported: ${filenameRef.current}`]);
                filenameRef.current = null;
            }

            const gates: (Gate | Circuit)[] = rawGates.map((data: unknown) =>
                deserializeGateFromAPI({ depth: 0, ...(data as Record<string, unknown>) } as SerializedGate)
            );

            let allGates: (Gate | Circuit)[] = [];

            for (let i = 0; i < gates.length; i += IMPORT_BATCH_SIZE) {
                const batch = gates.slice(i, Math.min(i + IMPORT_BATCH_SIZE, gates.length));
                allGates = batchInjectGates(batch, allGates);

                startTransition(() => setPlacedGates(allGates, { skipHistory: true }));

                if (i + IMPORT_BATCH_SIZE < gates.length) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
        }

        void constructCircuit();
    }, [job, setPlacedGates, setNumQubits, setMeasurements, setTags, batchInjectGates, filenameRef]);
}
