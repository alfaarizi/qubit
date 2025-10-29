import { useState, useEffect } from 'react';
import { CustomDialog } from './CustomDialog';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';
import { useCircuitDAG } from '@/features/circuit/hooks/useCircuitDAG';
import { getSpanQubits } from '@/features/gates/utils';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';

interface EditGateDialogProps {
    open: boolean;
    position: { x: number; y: number } | null;
    gate: Gate | Circuit | null;
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
    const [gateQubits, setGateQubits] = useState<number[]>([]);
    const [circuitStartQubit, setCircuitStartQubit] = useState<number>(0);
    const [currentGate, setCurrentGate] = useState<Gate | Circuit | null>(null);
    const placedGates = useCircuitStore(state => state.placedGates);
    const setPlacedGates = useCircuitStore(state => state.setPlacedGates);
    const { ejectGate, injectGate } = useCircuitDAG();

    useEffect(() => {
        if (open && gate) {
            if ('gate' in gate) {
                setGateQubits([...gate.controlQubits, ...gate.targetQubits]);
            } else {
                setCircuitStartQubit(gate.startQubit);
            }
            setCurrentGate(gate);
        }
    }, [open, gate]);

    const updateGate = (editedGate: Gate | Circuit) => {
        const editedSpanQubits = new Set(getSpanQubits(editedGate));
        const overlappingChildren = currentGate!.children.filter(childId => {
            const child = placedGates.find(g => g.id === childId);
            return child && getSpanQubits(child).some(q => editedSpanQubits.has(q));
        });
        const updatedGates = injectGate(
            editedGate,
            ejectGate(currentGate!, placedGates, overlappingChildren)
        );
        setPlacedGates(updatedGates);
        setCurrentGate(updatedGates.find(g => g.id === editedGate.id) || editedGate);
    };

    const handleGateQubitsChange = (index: number, newValue: number) => {
        if (!currentGate || 'circuit' in currentGate) return;

        const newQubits = [...gateQubits];
        const existingIndex = gateQubits.indexOf(newValue);

        // swap qubits
        if (existingIndex !== -1 && existingIndex !== index) {
            [newQubits[index], newQubits[existingIndex]] = [newQubits[existingIndex], newQubits[index]];
        } else {
            newQubits[index] = newValue;
        }

        setGateQubits(newQubits);

        // step 1: find children that still overlap with the edited gate's qubits
        // step 2: eject, excluding only children that still overlap
        const numControls = currentGate.controlQubits.length;
        updateGate({
            ...currentGate,
            controlQubits: newQubits.slice(0, numControls),
            targetQubits: newQubits.slice(numControls),
        });
    };

    const handleCircuitStartQubitChange = (newValue: number) => {
        if (!currentGate || !('circuit' in currentGate)) return;
        setCircuitStartQubit(newValue);
        updateGate({
            ...currentGate,
            startQubit: newValue
        });
    };

    if (!open || !gate || !position) return null;

    const isCircuit = 'circuit' in gate;
    const numControls = isCircuit ? 0 : gate.controlQubits.length;
    const availableQubits = Array.from({ length: numQubits }, (_, i) => i);
    const maxCircuitStart = isCircuit ? numQubits - getSpanQubits(gate).length : 0;

    return (
        <CustomDialog
            open={open}
            position={position}
            onClose={onClose}
            title={`Edit ${isCircuit ? gate.circuit.symbol : gate.gate.symbol}`}
            minWidth="320px"
            maxWidth="420px"
        >
            <div className="space-y-4">
                {isCircuit ? (
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium">Start (a)</label>
                        <select
                            value={circuitStartQubit}
                            onChange={(e) => handleCircuitStartQubitChange(parseInt(e.target.value))}
                            className="w-full h-9 px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {availableQubits.slice(0, maxCircuitStart + 1).map((q) => (
                                <option key={q} value={q}>q[{q}]</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    gateQubits.map((qubit, index) => {
                        const isControl = index < numControls;
                        const label = isControl
                            ? `Control (${String.fromCharCode(97 + index)})`
                            : `Target (${String.fromCharCode(97 + index)})`;
                        return (
                            <div key={index} className="space-y-1.5">
                                <label className="text-xs font-medium">{label}</label>
                                <select
                                    value={qubit}
                                    onChange={(e) => handleGateQubitsChange(index, parseInt(e.target.value))}
                                    className="w-full h-9 px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {availableQubits.map((q) => (
                                        <option key={q} value={q}>q[{q}]</option>
                                    ))}
                                </select>
                            </div>
                        );
                    })
                )}
            </div>
        </CustomDialog>
    );
}