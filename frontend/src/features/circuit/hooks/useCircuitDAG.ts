import { useCallback } from "react";
import type { Gate } from "@/features/gates/types";
import { createContiguousQubitArrays, getInvolvedQubits } from "@/features/gates/utils";

export function useCircuitDAG() {

    const createGatesMap = useCallback((gates: Gate[]) => {
        return new Map(gates.map(g => [g.id, { ...g, parents: [...g.parents], children: [...g.children] }]));
    }, []);

    const recalculateDepth = useCallback((
        gateId: string,
        gatesMap: Map<string, Gate>
    ): void => {
        const gate = gatesMap.get(gateId);
        if (!gate) return;
        const parentDepths = gate.parents.map(parentId => gatesMap.get(parentId)?.depth ?? -1);
        gate.depth = Math.max(-1, ...parentDepths) + 1;
        gate.children.forEach(childId => {
            recalculateDepth(childId, gatesMap);
        });
    }, []);

    const injectGate = useCallback((
        gate: Gate,
        gates: Gate[],
    ): Gate[] => {
        const gatesMap = createGatesMap(gates);
        const qubitToParent = new Map<number, Gate>();
        const qubitToChild = new Map<number, Gate>();

        const newGate: Gate = {
            ...gate,
            parents: [],
            children: [],
        };

        const gateQubits = new Set(getInvolvedQubits(newGate));
        gatesMap.forEach((currGate) => {
            const overlappingQubits = getInvolvedQubits(currGate).filter(q => gateQubits.has(q));

            if (overlappingQubits.length === 0) return;

            if (currGate.depth < newGate.depth) {
                overlappingQubits.forEach(qubit => {
                    const parent = qubitToParent.get(qubit);
                    if (!parent || currGate.depth > parent.depth) {
                        qubitToParent.set(qubit, currGate);
                    }
                });
            } else {
                overlappingQubits.forEach(qubit => {
                    const child = qubitToChild.get(qubit);
                    if (!child || currGate.depth < child.depth) {
                        qubitToChild.set(qubit, currGate);
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
        newGate.parents = Array.from(parentSet, g => g.id);
        parentSet.forEach(parent => {
            if (!parent.children.includes(newGate.id)) {
                parent.children.push(newGate.id);
            }
        });

        // Connect to children
        const childSet = new Set(qubitToChild.values());
        newGate.children = Array.from(childSet, g => g.id);
        childSet.forEach((child) => {
            if (!child.parents.includes(newGate.id)) {
                child.parents.push(newGate.id);
            }
        });

        gatesMap.set(newGate.id, newGate);
        recalculateDepth(newGate.id, gatesMap);
        return Array.from(gatesMap.values());
    }, [createGatesMap, recalculateDepth]);

    const ejectGate = useCallback((
        gate: Gate,
        gates: Gate[],
    ): Gate[] => {
        const gatesMap = createGatesMap(gates);
        const qubitToParent = new Map<number, Gate>();
        const gateQubits = new Set(getInvolvedQubits(gate));
        gate.parents.forEach(parentId => {
            const parent = gatesMap.get(parentId);
            if (!parent) return;
            parent.children = parent.children.filter(id => id !== gate.id);
            const overlappingQubits = getInvolvedQubits(parent).filter(q => gateQubits.has(q));
            overlappingQubits.forEach(qubit => {
                qubitToParent.set(qubit, parent);
            });
        });
        gate.children.forEach(childId => {
            const child = gatesMap.get(childId);
            if (!child) return;
            child.parents = child.parents.filter(id => id !== gate.id);
            const overlappingQubits = getInvolvedQubits(child).filter(q => gateQubits.has(q));
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
        gatesMap.delete(gate.id);
        return Array.from(gatesMap.values());
    }, [createGatesMap, recalculateDepth]);

    const moveGate = useCallback((
        gateId: string,
        gates: Gate[],
        targetDepth: number,
        targetQubit: number
    ): Gate[] => {
        const gateToMove = gates.find(g => g.id === gateId);
        if (!gateToMove) return gates;

        const gatesWithoutMoved = ejectGate(gateToMove, gates);
        const movedGate: Gate = {
            ...gateToMove,
            depth: targetDepth,
            ...createContiguousQubitArrays(gateToMove.gate, targetQubit)
        };

        return injectGate(movedGate, gatesWithoutMoved);
    }, [injectGate, ejectGate]);

    const removeGate = useCallback((
        gateId: string,
        gates: Gate[]
    ): Gate[] => {
        const gateToRemove = gates.find(g => g.id === gateId);
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