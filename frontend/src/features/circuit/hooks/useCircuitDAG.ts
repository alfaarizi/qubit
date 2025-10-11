import { useCallback } from "react";
import type { CircuitGate } from "@/features/gates/types";
import { createContiguousQubitArrays, getInvolvedQubits } from "@/features/gates/utils";

export function useCircuitDAG() {

    const createGatesMap = useCallback((gates: CircuitGate[]) => {
        return new Map(gates.map(g => [g.id, { ...g, parents: [...g.parents], children: [...g.children] }]));
    }, []);

    const recalculateDepth = useCallback((
        circuitGateId: string,
        gatesMap: Map<string, CircuitGate>
    ): void => {
        const gate = gatesMap.get(circuitGateId);
        if (!gate) return;
        const parentDepths = gate.parents.map(parentId => gatesMap.get(parentId)?.depth ?? -1);
        gate.depth = Math.max(-1, ...parentDepths) + 1;
        gate.children.forEach(childId => {
            recalculateDepth(childId, gatesMap);
        });
    }, []);

    const injectGate = useCallback((
        circuitGate: CircuitGate,
        gates: CircuitGate[],
    ): CircuitGate[] => {
        const gatesMap = createGatesMap(gates);
        const qubitToParent = new Map<number, CircuitGate>();
        const qubitToChild = new Map<number, CircuitGate>();

        const newCircuitGate: CircuitGate = {
            ...circuitGate,
            parents: [],
            children: [],
        };

        const circuitGateQubits = new Set(getInvolvedQubits(newCircuitGate));
        gatesMap.forEach((gate) => {
            const gateQubits = getInvolvedQubits(gate);
            const overlappingQubits = gateQubits.filter(q => circuitGateQubits.has(q));

            if (overlappingQubits.length === 0) return;

            if (gate.depth < newCircuitGate.depth) {
                overlappingQubits.forEach(qubit => {
                    const parent = qubitToParent.get(qubit);
                    if (!parent || gate.depth > parent.depth) {
                        qubitToParent.set(qubit, gate);
                    }
                });
            } else {
                overlappingQubits.forEach(qubit => {
                    const child = qubitToChild.get(qubit);
                    if (!child || gate.depth < child.depth) {
                        qubitToChild.set(qubit, gate);
                    }
                });
            }
        });

        for (const [qubit, parent] of qubitToParent) {
            const child = qubitToChild.get(qubit);
            if (child) {
                child.parents = child.parents.filter(id => id !== parent.id);
                parent.children = parent.children.filter(id => id !== child.id);
            }
        }

        // Connect to parents
        const parentSet = new Set(qubitToParent.values());
        newCircuitGate.parents = Array.from(parentSet, g => g.id); // <html>TS2322: Type 'string[]' is not assignable to type 'never[]'.<br/>Type 'string' is not assignable to type 'never'.
        parentSet.forEach(parent => {
            if (!parent.children.includes(newCircuitGate.id)) {
                parent.children.push(newCircuitGate.id);
            }
        });

        // Connect to children
        const childSet = new Set(qubitToChild.values());
        newCircuitGate.children = Array.from(childSet, g => g.id); // <html>TS2322: Type 'string[]' is not assignable to type 'never[]'.<br/>Type 'string' is not assignable to type 'never'.
        childSet.forEach((child) => {
            if (!child.parents.includes(newCircuitGate.id)) {
                child.parents.push(newCircuitGate.id);
            }
        });

        gatesMap.set(newCircuitGate.id, newCircuitGate);
        recalculateDepth(newCircuitGate.id, gatesMap);
        return Array.from(gatesMap.values());
    }, [createGatesMap, recalculateDepth]);

    const ejectGate = useCallback((
        circuitGate: CircuitGate,
        gates: CircuitGate[],
    ): CircuitGate[] => {
        const gatesMap = createGatesMap(gates);
        const qubitToParent = new Map<number, CircuitGate>();
        const circuitGateQubits = new Set(getInvolvedQubits(circuitGate));
        circuitGate.parents.forEach(parentId => {
            const parent = gatesMap.get(parentId);
            if (!parent) return;

            parent.children = parent.children.filter(id => id !== circuitGate.id);

            const parentQubits = getInvolvedQubits(parent);
            const overlappingQubits = parentQubits.filter(q => circuitGateQubits.has(q));
            overlappingQubits.forEach(qubit => {
                qubitToParent.set(qubit, parent);
            });
        });
        circuitGate.children.forEach(childId => {
            const child = gatesMap.get(childId);
            if (!child) return;

            child.parents = child.parents.filter(id => id !== circuitGate.id);

            const childQubits = getInvolvedQubits(child);
            const overlappingQubits = childQubits.filter(q => circuitGateQubits.has(q));
            overlappingQubits.forEach(qubit => {
                const parent = qubitToParent.get(qubit);
                if (!parent) return;
                if (!child.parents.includes(parent.id)) {
                    child.parents.push(parent.id);
                    parent.children.push(child.id);
                }
            });
            recalculateDepth(childId, gatesMap);
        });
        gatesMap.delete(circuitGate.id);
        return Array.from(gatesMap.values());
    }, [createGatesMap, recalculateDepth]);

    const moveGate = useCallback((
        circuitGateId: string,
        gates: CircuitGate[],
        targetDepth: number,
        targetQubit: number
    ): CircuitGate[] => {
        const gateToMove = gates.find(g => g.id === circuitGateId);
        if (!gateToMove) return gates;

        const gatesWithoutMoved = ejectGate(gateToMove, gates);
        const movedGate: CircuitGate = {
            ...gateToMove,
            depth: targetDepth,
            ...createContiguousQubitArrays(gateToMove.gate, targetQubit)
        };

        return injectGate(movedGate, gatesWithoutMoved);
    }, [injectGate, ejectGate]);

    const removeGate = useCallback((
        circuitGateId: string,
        gates: CircuitGate[]
    ): CircuitGate[] => {
        const gateToRemove = gates.find(g => g.id === circuitGateId);
        if (!gateToRemove) return gates;
        return ejectGate(gateToRemove, gates);
    }, [ejectGate]);

    return {
        injectGate,
        ejectGate,
        moveGate,
        removeGate,
    };
}