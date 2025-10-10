import React, { useState, useEffect, useCallback } from 'react';
import { dragState } from '@/lib/dragState';
import { GATES } from '@/features/gates/constants';
import type { CircuitGate } from '@/features/gates/types';
import { createContiguousQubitArrays } from "@/features/gates/utils";

interface UseDraggableGateProps {
    placedGates: CircuitGate[];
    setPlacedGates: React.Dispatch<React.SetStateAction<CircuitGate[]>>;
    getGridPosition: (e: { clientX: number; clientY: number }, gateQubits?: number) => { depth: number; qubit: number; y: number } | null;
    injectGate: (circuitGate: CircuitGate, circuitGateArr: CircuitGate[]) => CircuitGate[];
    onUpdateGatePosition: (gateId: string, targetDepth: number, startQubit: number) => void;
    onRemoveGate: (gateId: string) => void;
}

export function useDraggableGate({
    placedGates,
    setPlacedGates,
    getGridPosition,
    injectGate,
    onUpdateGatePosition,
    onRemoveGate
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

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (previewGate) return;

        const gate = findGateById(dragState.get());
        if (!gate) return;

        const totalQubits = gate.numTargetQubits + gate.numControlQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        const { targetQubits, controlQubits } = createContiguousQubitArrays(gate, pos.qubit);

        const newPreview: CircuitGate = {
            id: `${gate.id}-${crypto.randomUUID()}`,
            gate,
            depth: pos.depth,
            targetQubits,
            controlQubits,
            parents: [],
            children: [],
            shape: null
        };

        setPreviewGate(newPreview);
        setPlacedGates(prev => {
            return injectGate(newPreview, prev);
        });
    }, [findGateById, getGridPosition, injectGate, previewGate, setPlacedGates])

    // Drag from GatesPanel
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();

        if (!previewGate) return;

        const totalQubits = previewGate.gate.numTargetQubits + previewGate.gate.numControlQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        onUpdateGatePosition(previewGate.id, pos.depth, pos.qubit);
    }, [getGridPosition, onUpdateGatePosition, previewGate]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();

        if (!previewGate) return;

        setPreviewGate(null);
        dragState.clear();
    }, [previewGate]);

const onShowPreview = useCallback((gate: CircuitGate, depth: number, startQubit: number) => {
        const { targetQubits, controlQubits } = createContiguousQubitArrays(gate.gate, startQubit);
        const previewCopy: CircuitGate = {
            ...gate,
            depth,
            targetQubits,
            controlQubits
        };
        return setPreviewGate(previewCopy);
    }, []);


    const onHidePreview = useCallback(() => {
        if (!previewGate) return;
        onRemoveGate(previewGate.id);
        setPreviewGate(null);
    }, [onRemoveGate, previewGate]);

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
        handleDragEnter,
        handleDragOver,
        handleDrop,
        onShowPreview,
        onHidePreview,
        onStartDragging,
        onEndDragging
    };
}