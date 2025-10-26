import { useState, useEffect } from 'react';
import { CustomDialog } from './CustomDialog';
import { useCircuitDAG } from '@/features/circuit/hooks/useCircuitDAG';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';
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
    const { ejectGate, injectGate } = useCircuitDAG();
    const placedGates = useCircuitStore(state => state.placedGates);
    const setPlacedGates = useCircuitStore(state => state.setPlacedGates);

    useEffect(() => {
        if (open && gate) {
            setQubits([...gate.controlQubits, ...gate.targetQubits]);
            setCurrentGate(gate);
        }
    }, [open, gate]);

    const handleQubitChange = (index: number, newValue: number) => {
        if (!currentGate) return;

        const existingIndex = qubits.indexOf(newValue);
        let newQubits: number[];

        if (existingIndex !== -1 && existingIndex !== index) {
            // Swap qubits
            newQubits = [...qubits];
            newQubits[existingIndex] = qubits[index];
            newQubits[index] = newValue;
        } else {
            // Just update
            newQubits = [...qubits];
            newQubits[index] = newValue;
        }

        setQubits(newQubits);

        // Immediately apply the change to the circuit
        const numControls = currentGate.controlQubits.length;
        const gatesWithoutEdited = ejectGate(currentGate, placedGates);

        const editedGate: Gate = {
            ...currentGate,
            controlQubits: newQubits.slice(0, numControls),
            targetQubits: newQubits.slice(numControls),
        };

        const gatesWithEdited = injectGate(editedGate, gatesWithoutEdited);
        setPlacedGates(gatesWithEdited);
        setCurrentGate(editedGate); // Update reference for next change
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
