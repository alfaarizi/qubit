import { useCallback } from "react";
import type { Gate } from "@/features/gates/types";
import type { Circuit } from "@/features/circuit/types";
import { getSpanQubits, getQubitSpan } from "@/features/gates/utils";

interface QubitMaps {
    qubitToParent: Map<number, Gate | Circuit>;
    qubitToChild: Map<number, Gate | Circuit>;
}

export function useCircuitDAG() {

    const createItemsMap = useCallback((items: (Gate | Circuit)[]) => {
        const map = new Map<string, Gate | Circuit>();
        for (const item of items) {
            map.set(item.id, {
                ...item,
                parents: [...item.parents],
                children: [...item.children]
            });
        }
        return map;
    }, []);

    const createQubitMaps = useCallback((
        items: (Gate | Circuit)[],
        newItemDepth: number,
        newItemQubits: Set<number>
    ): QubitMaps => {
        const qubitToParent = new Map<number, Gate | Circuit>();
        const qubitToChild = new Map<number, Gate | Circuit>();
        for (const item of items) {
            const itemSpanQubits = getSpanQubits(item);
            const overlapsQubit = itemSpanQubits.some(q => newItemQubits.has(q));
            
            if (!overlapsQubit) continue;

            if (item.depth < newItemDepth) {
                for (const qubit of itemSpanQubits) {
                    if (!newItemQubits.has(qubit)) continue;
                    const parent = qubitToParent.get(qubit);
                    if (!parent || item.depth > parent.depth) {
                        qubitToParent.set(qubit, item);
                    }
                }
            } else {
                for (const qubit of itemSpanQubits) {
                    if (!newItemQubits.has(qubit)) continue;
                    const child = qubitToChild.get(qubit);
                    if (!child || item.depth < child.depth) {
                        qubitToChild.set(qubit, item);
                    }
                }
            }
        }
        return { qubitToParent, qubitToChild };
    }, []);

    const getItemWidth = useCallback((item: Gate | Circuit): number => {
        if ('circuit' in item) {
            if (item.circuit.gates.length === 0) return 1;
            let maxEndPosition = 0;
            for (const g of item.circuit.gates) {
                const width = getItemWidth(g);
                const endPosition = g.depth + width;
                if (endPosition > maxEndPosition) maxEndPosition = endPosition;
            }
            return maxEndPosition;
        }
        return 1;
    }, []);

    const recalculateDepth = useCallback((
        itemId: string,
        itemsMap: Map<string, Gate | Circuit>
    ): void => {
        const item = itemsMap.get(itemId);
        if (!item) return;
        let maxDepth = 0;
        for (const parentId of item.parents) {
            const parent = itemsMap.get(parentId);
            if (parent) {
                const width = getItemWidth(parent);
                const depth = parent.depth + width;
                if (depth > maxDepth) maxDepth = depth;
            }
        }
        item.depth = maxDepth;
        for (const childId of item.children) {
            recalculateDepth(childId, itemsMap);
        }
    }, [getItemWidth]);

    const injectGate = useCallback((
        item: Gate | Circuit,
        items: (Gate | Circuit)[],
        startDepth?: number,
        qubitMaps?: QubitMaps
    ): (Gate | Circuit)[] => {
        const itemsMap = createItemsMap(items);
        const newItem: Gate | Circuit = {
            ...item,
            depth: startDepth ?? item.depth,
            parents: [],
            children: []
        };

        const newItemSpanQubits = new Set(getSpanQubits(newItem));
        const { qubitToParent, qubitToChild } = qubitMaps || createQubitMaps(items, newItem.depth, newItemSpanQubits);

        for (const [qubit, parentRef] of qubitToParent) {
            const childRef = qubitToChild.get(qubit);
            if (childRef) {
                const parent = itemsMap.get(parentRef.id);
                const child = itemsMap.get(childRef.id);
                if (parent && child) {
                    child.parents = child.parents.filter(id => id !== parentRef.id);
                    parent.children = parent.children.filter(id => id !== childRef.id);
                }
            }
        }

        const parentSet = new Set(qubitToParent.values());
        newItem.parents = Array.from(parentSet, p => p.id);
        for (const parentRef of parentSet) {
            const parent = itemsMap.get(parentRef.id);
            if (parent && !parent.children.includes(newItem.id)) {
                parent.children.push(newItem.id);
            }
        }

        const childSet = new Set(qubitToChild.values());
        newItem.children = Array.from(childSet, c => c.id);
        for (const childRef of childSet) {
            const child = itemsMap.get(childRef.id);
            if (child && !child.parents.includes(newItem.id)) {
                child.parents.push(newItem.id);
            }
        }

        itemsMap.set(newItem.id, newItem);
        recalculateDepth(newItem.id, itemsMap);
        return Array.from(itemsMap.values());
    }, [createItemsMap, recalculateDepth, createQubitMaps]);

    const ejectGate = useCallback((
        item: Gate | Circuit,
        items: (Gate | Circuit)[],
        excludeItemIds: string[] = []
    ): (Gate | Circuit)[] => {
        const itemsMap = createItemsMap(items);
        const itemSpanQubits = new Set(getSpanQubits(item));
        
        const qubitToParent = new Map<number, Gate | Circuit>();
        const excludeSet = new Set(excludeItemIds);

        const sortedItemParents = item.parents
            .map(parentId => itemsMap.get(parentId))
            .filter((parent): parent is Gate | Circuit => parent !== undefined)
            .sort((a, b) => a.depth - b.depth);

        for (const parent of sortedItemParents) {
            parent.children = parent.children.filter(id => id !== item.id);
            const parentSpanQubits = getSpanQubits(parent);
            for (const qubit of parentSpanQubits) {
                if (itemSpanQubits.has(qubit)) {
                    qubitToParent.set(qubit, parent);
                }
            }
        }

        for (const childId of item.children) {
            const child = itemsMap.get(childId);
            if (!child) continue;
            
            child.parents = child.parents.filter(id => id !== item.id);
            if (excludeSet.has(childId)) continue;

            const childSpanQubits = getSpanQubits(child);
            for (const qubit of childSpanQubits) {
                if (!itemSpanQubits.has(qubit)) continue;
                
                const parentRef = qubitToParent.get(qubit);
                if (!parentRef) continue;
                
                const parent = itemsMap.get(parentRef.id);
                if (parent && !child.parents.includes(parent.id)) {
                    child.parents.push(parent.id);
                    parent.children.push(child.id);
                }
            }
            recalculateDepth(childId, itemsMap);
        }

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
        getItemWidth,
        buildQubitMaps: createQubitMaps
    };
}