import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CustomDialog } from './CustomDialog';
import type { Gate } from '@/features/gates/types';
import { useCircuitDAG } from '@/features/circuit/hooks/useCircuitDAG';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';

interface EditGateDialogProps {
    open: boolean;
    position: { x: number; y: number } | null;
    gate: Gate | null;
    numQubits: number;
    onClose: () => void;
    onConfirm: (controlQubits: number[], targetQubits: number[]) => void;
}

export function EditGateDialog({
    open,
    position,
    gate,
    numQubits,
    onClose,
    onConfirm,
}: EditGateDialogProps) {
    const [controlQubits, setControlQubits] = useState<number[]>([]);
    const [targetQubits, setTargetQubits] = useState<number[]>([]);
    // Reset values when opened
    useEffect(() => {
        if (open && gate) {
            setControlQubits([...gate.controlQubits]);
            setTargetQubits([...gate.targetQubits]);
        }
    }, [open, gate]);

    const handleQubitChange = (type: 'control' | 'target', index: number, newValue: number) => {
        if (type === 'control') {
            const newControlQubits = [...controlQubits];
            const oldValue = newControlQubits[index];
            
            // Check if newValue is already used
            const controlIndex = newControlQubits.indexOf(newValue);
            const targetIndex = targetQubits.indexOf(newValue);
            
            if (controlIndex !== -1 && controlIndex !== index) {
                // Swap with another control qubit
                newControlQubits[controlIndex] = oldValue;
            } else if (targetIndex !== -1) {
                // Swap with a target qubit
                const newTargetQubits = [...targetQubits];
                newTargetQubits[targetIndex] = oldValue;
                setTargetQubits(newTargetQubits);
            }
            
            newControlQubits[index] = newValue;
            setControlQubits(newControlQubits);
        } else {
            const newTargetQubits = [...targetQubits];
            const oldValue = newTargetQubits[index];
            
            // Check if newValue is already used
            const controlIndex = controlQubits.indexOf(newValue);
            const targetIndex = newTargetQubits.indexOf(newValue);
            
            if (targetIndex !== -1 && targetIndex !== index) {
                // Swap with another target qubit
                newTargetQubits[targetIndex] = oldValue;
            } else if (controlIndex !== -1) {
                // Swap with a control qubit
                const newControlQubits = [...controlQubits];
                newControlQubits[controlIndex] = oldValue;
                setControlQubits(newControlQubits);
            }
            
            newTargetQubits[index] = newValue;
            setTargetQubits(newTargetQubits);
        }
    };

    const { ejectGate, injectGate } = useCircuitDAG();
    const setPlacedGates = useCircuitStore(s => s.setPlacedGates);
    const placedGates = useCircuitStore(s => s.placedGates);

    const handleConfirm = () => {
        if (gate) {
            // Remove the gate from the circuit
            const gatesWithout = ejectGate(gate, placedGates);
            // Create updated gate
            const updatedGate = {
                ...gate,
                controlQubits,
                targetQubits,
            };
            // Re-inject the gate, which will recalculate dependencies and move other gates as needed
            const newGates = injectGate(updatedGate, gatesWithout);
            setPlacedGates(newGates);
        }
        onConfirm(controlQubits, targetQubits);
        onClose();
    };

    if (!open || !gate || !position) return null;

    const availableQubits = Array.from({ length: numQubits }, (_, i) => i);

    return (
        <CustomDialog open={open} position={position} onClose={onClose} title="Edit Gate Qubits" minWidth="320px" maxWidth="420px">
            <div className="space-y-4">
                <div className="text-xs text-muted-foreground mb-2">
                    Gate: <span className="font-semibold text-foreground">{gate.gate.name}</span>
                </div>
                {/* Control Qubits */}
                {controlQubits.map((qubit, index) => (
                    <div key={`control-${index}`} className="space-y-1.5">
                        <label className="text-xs font-medium">
                            Control {String.fromCharCode(97 + index)}
                        </label>
                        <select
                            value={qubit}
                            onChange={(e) => handleQubitChange('control', index, parseInt(e.target.value))}
                            className="w-full h-9 px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {availableQubits.map((q) => (
                                <option key={q} value={q}>
                                    q[{q}]
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
                {/* Target Qubits */}
                {targetQubits.map((qubit, index) => (
                    <div key={`target-${index}`} className="space-y-1.5">
                        <label className="text-xs font-medium">
                            Target {String.fromCharCode(97 + index)}
                        </label>
                        <select
                            value={qubit}
                            onChange={(e) => handleQubitChange('target', index, parseInt(e.target.value))}
                            className="w-full h-9 px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {availableQubits.map((q) => (
                                <option key={q} value={q}>
                                    q[{q}]
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleConfirm}>
                        Apply Changes
                    </Button>
                </div>
            </div>
        </CustomDialog>
    );
}
