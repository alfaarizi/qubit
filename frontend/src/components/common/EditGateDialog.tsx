import { useState, useEffect } from 'react';
import { CustomDialog } from './CustomDialog';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';
import { useCircuitDAG } from '@/features/circuit/hooks/useCircuitDAG';
import { getSpanQubits } from '@/features/gates/utils';
import type { Gate } from '@/features/gates/types';

interface EditGateDialogProps {
    open: boolean;
    position: { x: number; y: number } | null;
    gate: Gate | null;
    numQubits: number;
    onClose: () => void;
}

export function EditGateDialog({
    open,
    position,
    gate,
    numQubits,
    onClose,
}: EditGateDialogProps) {
    const [qubits, setQubits] = useState<number[]>([]);
    const [currentGate, setCurrentGate] = useState<Gate | null>(null);
    const placedGates = useCircuitStore(state => state.placedGates);
    const setPlacedGates = useCircuitStore(state => state.setPlacedGates);
    const { ejectGate, injectGate } = useCircuitDAG();

    useEffect(() => {
        if (open && gate) {
            setQubits([...gate.controlQubits, ...gate.targetQubits]);
            setCurrentGate(gate);
        }
    }, [open, gate]);

    const handleQubitChange = (index: number, newValue: number) => {
        if (!currentGate) return;

        const newQubits = [...qubits];
        const existingIndex = qubits.indexOf(newValue);

        if (existingIndex !== -1 && existingIndex !== index) {
            [newQubits[index], newQubits[existingIndex]] = [newQubits[existingIndex], newQubits[index]];
        } else {
            newQubits[index] = newValue;
        }

        setQubits(newQubits);

        const numControls = currentGate.controlQubits.length;
        const editedGate: Gate = {
            ...currentGate,
            controlQubits: newQubits.slice(0, numControls),
            targetQubits: newQubits.slice(numControls),
        };

        // Prevent collapse: exclude children that still overlap with edited gate from reconnection
        // Children that no longer overlap will collapse properly by reconnecting to earlier parents
        const newSpanQubits = new Set(getSpanQubits(editedGate));
        const childrenToExclude = currentGate.children.filter(childId => {
            const child = placedGates.find(g => g.id === childId);
            if (!child) return false;
            const childSpanQubits = getSpanQubits(child);
            return childSpanQubits.some(q => newSpanQubits.has(q));
        });

        setPlacedGates(injectGate(editedGate, ejectGate(currentGate, placedGates, childrenToExclude)));
        setCurrentGate(editedGate);
    };

    if (!open || !gate || !position) return null;

    const availableQubits = Array.from({ length: numQubits }, (_, i) => i);
    const numControls = gate.controlQubits.length;

    return (
        <CustomDialog
            open={open}
            position={position}
            onClose={onClose}
            title={`Edit ${gate.gate.symbol}`}
            minWidth="320px"
            maxWidth="420px"
        >
            <div className="space-y-4">
                {qubits.map((qubit, index) => {
                    const isControl = index < numControls;
                    const label = isControl
                        ? `Control (${String.fromCharCode(97 + index)})`
                        : `Target (${String.fromCharCode(97 + index)})`;

                    return (
                        <div key={index} className="space-y-1.5">
                            <label className="text-xs font-medium">{label}</label>
                            <select
                                value={qubit}
                                onChange={(e) => handleQubitChange(index, parseInt(e.target.value))}
                                className="w-full h-9 px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                {availableQubits.map((q) => (
                                    <option key={q} value={q}>q[{q}]</option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
        </CustomDialog>
    );
}
