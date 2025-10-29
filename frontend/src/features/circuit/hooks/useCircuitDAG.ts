import { useCallback } from "react";
import type { Gate } from "@/features/gates/types";
import type { Circuit } from "@/features/circuit/types";
import { getSpanQubits, getQubitSpan } from "@/features/gates/utils";

export function useCircuitDAG() {

    const createItemsMap = useCallback((items: (Gate | Circuit)[]) => {
        return new Map(items.map(item => [item.id, { ...item, parents: [...item.parents], children: [...item.children] }]));
    }, []);

    const getItemWidth = useCallback((item: Gate | Circuit): number => {
        if ('circuit' in item) {
            if (item.circuit.gates.length === 0) return 1;
            const endPositions = item.circuit.gates.map(g => {
                const width = getItemWidth(g);
                return g.depth + width;
            });
            return Math.max(...endPositions);
        }
        return 1;
    }, []);

    const recalculateDepth = useCallback((
        itemId: string,
        itemsMap: Map<string, Gate | Circuit>
    ): void => {
        const item = itemsMap.get(itemId);
        if (!item) return;

        const parentDepths = item.parents.map(parentId => {
            const parent = itemsMap.get(parentId);
            if (!parent) return -1;
            const width = getItemWidth(parent);
            return parent.depth + width;
        });
        item.depth = Math.max(0, ...parentDepths);
        item.children.forEach(childId => {
            recalculateDepth(childId, itemsMap);
        });
    }, [getItemWidth]);

    const injectGate = useCallback((
        item: Gate | Circuit,
        items: (Gate | Circuit)[],
    ): (Gate | Circuit)[] => {
        const itemsMap = createItemsMap(items);
        const qubitToParent = new Map<number, Gate | Circuit>();
        const qubitToChild = new Map<number, Gate | Circuit>();

        const newItem: Gate | Circuit = {
            ...item,
            parents: [],
            children: []
        };

        const spanQubits = new Set(getSpanQubits(newItem));

        itemsMap.forEach((currItem) => {
            const overlappingQubits = getSpanQubits(currItem).filter(q => spanQubits.has(q));

            if (overlappingQubits.length === 0) return;

            if (currItem.depth < newItem.depth) {
                overlappingQubits.forEach(qubit => {
                    const parent = qubitToParent.get(qubit);
                    if (!parent || currItem.depth > parent.depth) {
                        qubitToParent.set(qubit, currItem);
                    }
                });
            } else {
                overlappingQubits.forEach(qubit => {
                    const child = qubitToChild.get(qubit);
                    if (!child || currItem.depth < child.depth) {
                        qubitToChild.set(qubit, currItem);
                    }
                });
            }
        });

        // disconnect old parent-child relationships on overlapping qubits
        // NOTE: this is important to handle injection between gates
        for (const [qubit, parent] of qubitToParent) {
            const child = qubitToChild.get(qubit);
            if (child) {
                child.parents = child.parents.filter(id => id !== parent.id);
                parent.children = parent.children.filter(id => id !== child.id);
            }
        }

        // Connect to parents
        const parentSet = new Set(qubitToParent.values());
        // Sort parents by depth ascending
        const sortedParents = Array.from(parentSet).sort((a, b) => a.depth - b.depth);
        newItem.parents = sortedParents.map(p => p.id);
        sortedParents.forEach(parent => {
            if (!parent.children.includes(newItem.id)) {
                parent.children.push(newItem.id);
            }
        });

        // Connect to children
        const childSet = new Set(qubitToChild.values());
        newItem.children = Array.from(childSet, c => c.id);
        childSet.forEach((child) => {
            if (!child.parents.includes(newItem.id)) {
                child.parents.push(newItem.id);
            }
        });

        itemsMap.set(newItem.id, newItem);
        recalculateDepth(newItem.id, itemsMap);
        return Array.from(itemsMap.values());
    }, [createItemsMap, recalculateDepth]);

    const ejectGate = useCallback((
        item: Gate | Circuit,
        items: (Gate | Circuit)[],
        excludeItemIds: string[] = []
    ): (Gate | Circuit)[] => {
        const itemsMap = createItemsMap(items);
        const qubitToParent = new Map<number, Gate | Circuit>();
        const spanQubits = new Set(getSpanQubits(item));

        // Sort parents by depth, filtering out any that don't exist
        item.parents
            .map(parentId => ({ id: parentId, parent: itemsMap.get(parentId) }))
            .filter(({ parent }) => parent !== undefined)
            .sort((a, b) => {
                const x = a.parent!.depth;
                const y = b.parent!.depth;
                return x === y ? 0 : x > y ? 1 : -1;
            })
            .forEach(({ parent }) => {
                if (!parent) return;
                parent.children = parent.children.filter(id => id !== item.id);
                const overlappingQubits = getSpanQubits(parent).filter(q => spanQubits.has(q));
                overlappingQubits.forEach(qubit => {
                    qubitToParent.set(qubit, parent);
                });
            });

        item.children.forEach(childId => {
            const child = itemsMap.get(childId);
            if (!child) return;
            child.parents = child.parents.filter(id => id !== item.id);

            // Skip reconnection if child is in exclude list
            if (excludeItemIds.includes(childId)) return;

            const overlappingQubits = getSpanQubits(child).filter(q => spanQubits.has(q));
            overlappingQubits.forEach(qubit => {
                const parent = qubitToParent.get(qubit);
                if (!parent) return;
                if (!child.parents.includes(parent.id)) {
                    child.parents.push(parent.id);
                    parent.children.push(child.id);
                }
            });
            recalculateDepth(childId, itemsMap);
        });

        itemsMap.delete(item.id);
        return Array.from(itemsMap.values());
    }, [createItemsMap, recalculateDepth]);

    const moveGate = useCallback((
        itemId: string,
        items: (Gate | Circuit)[],
        targetDepth: number,
        targetQubit: number
    ): (Gate | Circuit)[] => {
        const itemToMove = items.find(item => item.id === itemId);
        if (!itemToMove) return items;

        const itemsWithoutMoved = ejectGate(itemToMove, items);

        const { minQubit } = getQubitSpan(itemToMove);
        const qubitOffset = targetQubit - minQubit;

        const movedItem: Gate | Circuit = 'gate' in itemToMove
            ? {
                ...itemToMove,
                depth: targetDepth,
                targetQubits: itemToMove.targetQubits.map(q => q + qubitOffset),
                controlQubits: itemToMove.controlQubits.map(q => q + qubitOffset)
            }
            : {
                ...itemToMove,
                depth: targetDepth,
                startQubit: targetQubit
            };

        return injectGate(movedItem, itemsWithoutMoved);
    }, [injectGate, ejectGate]);

    const removeGate = useCallback((
        gateId: string,
        items: (Gate | Circuit)[]
    ): (Gate | Circuit)[] => {
        const itemToRemove = items.find(item => item.id === gateId);
        if (!itemToRemove) return items;

        return ejectGate(itemToRemove, items);
    }, [ejectGate]);

    return {
        injectGate,
        ejectGate,
        moveGate,
        removeGate,
    };
}