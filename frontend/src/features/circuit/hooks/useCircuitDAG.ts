import { useCallback } from "react";
import type { Gate } from "@/features/gates/types";
import type { Circuit } from "@/features/circuit/types";
import { getInvolvedQubits, getQubitSpanQubits } from "@/features/gates/utils";

export function useCircuitDAG() {

    // const calculateWidth = useCallback((
    //     item: Gate | Circuit,
    // ): number => {
    //     const spanQubits = getQubitSpanQubits(item);
        
        
        
    //     return spanQubits.length;
    // }, []);

    const createGatesMap = useCallback((items: (Gate | Circuit)[]) => {
        const gates = items.filter((item): item is Gate => 'gate' in item).sort((a, b) => a.depth - b.depth);
        return new Map(gates.map(g => [g.id, { ...g, parents: [...g.parents], children: [...g.children] }]));
    }, []);

    const recalculateDepth = useCallback((
        gateId: string,
        gatesMap: Map<string, Gate>
    ): void => {
        const gate = gatesMap.get(gateId);
        if (!gate) return;
        const parentDepths = gate.parents.map(parentId => 1 + (gatesMap.get(parentId)?.depth ?? -1));
        // gate.parents.forEach(parentId => {
        //     const parent = gatesMap.get(parentId);
        //     if (parent) {
        //         parent.children = parent.children.filter(id => id !== gate.id);
        //         gate.parents.forEach(childId => {}

        //         );
        //     }
        // });

        gate.depth = Math.max(0, ...parentDepths);
        gate.children.forEach(childId => {
            recalculateDepth(childId, gatesMap);
        });
    }, []);

    const injectGate = useCallback((
        gate: Gate,
        items: (Gate | Circuit)[],
    ): (Gate | Circuit)[] => {
        const gatesMap = createGatesMap(items);
        const circuits = items.filter((item): item is Circuit => 'circuit' in item);
        const qubitToParent = new Map<number, Gate>();
        const qubitToChild = new Map<number, Gate>();

        const newGate: Gate = {
            ...gate,
            parents: [],
            children: [],
        };

        const involvedQubits = new Set(getInvolvedQubits(newGate));
        const spanQubits = new Set(getQubitSpanQubits(newGate));
        gatesMap.forEach((currGate) => {
            const overlappingQubits = getInvolvedQubits(currGate).filter(q => involvedQubits.has(q));
            const overlappingSpanQubits = getQubitSpanQubits(currGate).filter(q => spanQubits.has(q));

            const trueParent = overlappingQubits.length > 0;

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
            if (!trueParent) {
                overlappingSpanQubits.forEach(qubit => {
                    const parent = qubitToParent.get(qubit);
                    if (parent ? currGate.depth === parent.depth + 1 : currGate.depth === 0) {
                        qubitToParent.set(qubit, currGate);
                    }
                });
                overlappingSpanQubits.forEach(qubit => {
                    const child = qubitToChild.get(qubit);
                    if (child ? currGate.depth === child.depth - 1 : false) {
                        qubitToChild.set(qubit, currGate);
                    }
                });
            }
        });

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
        return [...Array.from(gatesMap.values()), ...circuits];
    }, [createGatesMap, recalculateDepth]);

    const ejectGate = useCallback((
        gate: Gate,
        items: (Gate | Circuit)[],
    ): (Gate | Circuit)[] => {
        const gatesMap = createGatesMap(items);
        const circuits = items.filter((item): item is Circuit => 'circuit' in item);
        const qubitToParent = new Map<number, Gate>(); 
        
        const involvedQubits = new Set(getInvolvedQubits(gate));
        const spanQubits = new Set(getQubitSpanQubits(gate));
        gate.parents.sort((a, b) => {
            const x = gatesMap.get(a)!.depth;
            const y = gatesMap.get(b)!.depth;
            if (x === y) return 0;
            return x > y ? 1 : -1;
        }).forEach(parentId => {
            const parent = gatesMap.get(parentId);
            if (!parent) return;
            parent.children = parent.children.filter(id => id !== gate.id);
            const overlappingQubits = getInvolvedQubits(parent).filter(q => involvedQubits.has(q));
            const overlappingSpanQubits = getQubitSpanQubits(parent).filter(q => spanQubits.has(q));
            
            // const trueParent = overlappingQubits.length > 0;

            overlappingQubits.forEach(qubit => {
                qubitToParent.set(qubit, parent);
            });
            // if (!trueParent) {
                overlappingSpanQubits.forEach(qubit => {
                    // const parent = qubitToParent.get(qubit);
                    // if (parent ? gate.depth === parent.depth + 1 : gate.depth === 0) {
                        qubitToParent.set(qubit, parent);
                    // }
                });
            // }
        });
        // console.log(qubitToParent);
        gate.children.forEach(childId => {
            const child = gatesMap.get(childId);
            if (!child) return;
            child.parents = child.parents.filter(id => id !== gate.id);
            const overlappingQubits = getInvolvedQubits(child).filter(q => involvedQubits.has(q));
            const overlappingSpanQubits = getQubitSpanQubits(child).filter(q => spanQubits.has(q));
            
            const trueParent = overlappingQubits.length > 0;

            overlappingQubits.forEach(qubit => {
                const parent = qubitToParent.get(qubit);
                if (!parent) return;
                if (!child.parents.includes(parent.id)) {
                    child.parents.push(parent.id);
                    parent.children.push(child.id);
                }
            });
            if (!trueParent) {
                overlappingSpanQubits.forEach(qubit => {
                    const parent = qubitToParent.get(qubit);
                    if (!parent) return;
                    if (!child.parents.includes(parent.id)) {
                        child.parents.push(parent.id);
                        parent.children.push(child.id);
                    }
                });
            }
            recalculateDepth(childId, gatesMap);
        });
        gatesMap.delete(gate.id);
        return [...Array.from(gatesMap.values()), ...circuits];
    }, [createGatesMap, recalculateDepth]);

    const moveGate = useCallback((
        gateId: string,
        items: (Gate | Circuit)[],
        targetDepth: number,
        targetQubit: number
    ): (Gate | Circuit)[] => {
        const gateToMove = items.find((item): item is Gate => 'gate' in item && item.id === gateId);
        if (!gateToMove) return items;

        const gatesWithoutMoved = ejectGate(gateToMove, items);
        
        // For moved gates, we need to adjust qubit positions based on the new target qubit
        // we calculate the offset from the original position to maintain relative qubit assignments
        const qubitStart = Math.min(...getInvolvedQubits(gateToMove));
        const qubitOffset = targetQubit - qubitStart;
        
        const movedGate: Gate = {
            ...gateToMove,
            depth: targetDepth,
            targetQubits: gateToMove.targetQubits.map(q => q + qubitOffset),
            controlQubits: gateToMove.controlQubits.map(q => q + qubitOffset)
        };

        return injectGate(movedGate, gatesWithoutMoved);
    }, [injectGate, ejectGate]);

    const removeGate = useCallback((
        gateId: string,
        items: (Gate | Circuit)[]
    ): (Gate | Circuit)[] => {
        // Check if it's a circuit - just filter it out
        const itemToRemove = items.find(item => item.id === gateId);
        if (!itemToRemove) return items;

        if ('circuit' in itemToRemove) {
            return items.filter(item => item.id !== gateId);
        }
        // It's a gate - use ejectGate for DAG management
        return ejectGate(itemToRemove, items);
    }, [ejectGate]);

    return {
        injectGate,
        ejectGate,
        moveGate,
        removeGate,
    };
}