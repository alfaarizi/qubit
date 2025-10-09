import React, { useState, useEffect, useCallback } from 'react';
import { dragState } from '@/lib/dragState';
import { GATES } from '@/features/gates/constants';
import type { CircuitGate } from '@/features/gates/types';
import { createContiguousQubitArrays } from "@/features/gates/utils";

interface UseDraggableGateProps {
    placedGates: CircuitGate[];
    setPlacedGates: React.Dispatch<React.SetStateAction<CircuitGate[]>>;
    getGridPosition: (e: { clientX: number; clientY: number }, gateQubits?: number) => { depth: number; qubit: number; y: number } | null;
    findNextAvailableDepth: (startQubit: number, endQubit: number, excludeId?: string) => number;
}

export function useDraggableGate({
    placedGates,
    setPlacedGates,
    getGridPosition,
    findNextAvailableDepth,
}: UseDraggableGateProps) {
    const [previewGate, setPreviewGate] = useState<CircuitGate | null>(null);
    const [dragGateId, setDragGateId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

    const findGateById = useCallback((gateId: string | null) => {
        if (!gateId) return null;
        return GATES.find(g => g.id === gateId) || null;
    }, []);

    // Show floating preview at cursor while dragging
    useEffect(() => {
        if (!dragGateId) {
            setCursorPos(null);
            return;
        }
        const moveCursor = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
        document.addEventListener('mousemove', moveCursor);
        document.addEventListener('mousedown', moveCursor, { once: true });
        return () => {
            document.removeEventListener('mousemove', moveCursor);
            document.removeEventListener('mousedown', moveCursor);
        };
    }, [dragGateId]);

    // Drag from GatesPanel
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const gate = findGateById(dragState.get());
        if (!gate) return;

        const totalQubits = gate.numControlQubits + gate.numTargetQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        const nextDepth = findNextAvailableDepth(pos.qubit, pos.qubit + totalQubits - 1);
        const { targetQubits, controlQubits } = createContiguousQubitArrays(gate, pos.qubit);

        setPreviewGate({
            id: `${gate.id}-preview`,
            gate,
            depth: nextDepth,
            targetQubits,
            controlQubits,
        });
    }, [findGateById, getGridPosition, findNextAvailableDepth]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const gate = findGateById(dragState.get());
        if (!gate) return;

        const totalQubits = gate.numControlQubits + gate.numTargetQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        const nextDepth = findNextAvailableDepth(pos.qubit, pos.qubit + totalQubits - 1);
        const { targetQubits, controlQubits } = createContiguousQubitArrays(gate, pos.qubit);

        const newGate: CircuitGate = {
            id: `${gate.id}-${crypto.randomUUID()}`,
            gate,
            depth: nextDepth,
            targetQubits,
            controlQubits
        };

        setPlacedGates(prev => [...prev, newGate]);
        setPreviewGate(null);
    }, [findGateById, getGridPosition, findNextAvailableDepth, setPlacedGates]);

    const onShowPreview = useCallback((gate: CircuitGate['gate'], depth: number, startQubit: number) => {
        const { targetQubits, controlQubits } = createContiguousQubitArrays(gate, startQubit);
        setPreviewGate({
            id: dragGateId || `${gate.id}-preview`,
            gate,
            depth,
            targetQubits,
            controlQubits
        });
    }, [dragGateId]);

    const onHidePreview = useCallback(() => {
        setPreviewGate(null);
    }, []);

    const onStartDragging = useCallback((gateId: string, offset: { x: number; y: number }) => {
        setDragGateId(gateId);
        setDragOffset(offset);
    }, []);

    const onEndDragging = useCallback(() => {
        setPreviewGate(null);
        setDragGateId(null);
        setDragOffset({ x: 0, y: 0 });
    }, []);

    const floatingGate = dragGateId ? placedGates.find(g => g.id === dragGateId)?.gate : null;

    return {
        dragGateId,
        previewGate,
        floatingGate,
        dragOffset,
        cursorPos,
        handleDragOver,
        handleDrop,
        onShowPreview,
        onHidePreview,
        onStartDragging,
        onEndDragging
    };
}