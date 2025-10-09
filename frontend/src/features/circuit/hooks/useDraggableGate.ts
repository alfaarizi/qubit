import React, { useState, useEffect, useCallback } from 'react';
import { dragState } from '@/lib/dragState';
import { GATES } from '@/features/gates/constants';
import type { CircuitGate } from '@/features/gates/types';

interface UseDraggableGateProps {
    placedGates: CircuitGate[];
    setPlacedGates: React.Dispatch<React.SetStateAction<CircuitGate[]>>;
    getGridPosition: (e: { clientX: number; clientY: number }, gateQubits?: number) => { depth: number; qubit: number; y: number } | null;
    packGates: (gates: CircuitGate[]) => CircuitGate[];
}

export function useDraggableGate({
    placedGates,
    setPlacedGates,
    getGridPosition,
    packGates
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
        const pos = getGridPosition(e, gate.qubits);
        if (!pos) return;

        const preview = { id: `${gate.id}-preview`, gate, depth: pos.depth, qubit: pos.qubit };
        const packed = packGates([...placedGates, preview]);
        const finalPreview = packed.find(g => g.id === 'preview');

        setPreviewGate(finalPreview || preview);
    }, [findGateById, getGridPosition, packGates, placedGates]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const gate = findGateById(dragState.get());
        if (!gate) return;
        const pos = getGridPosition(e, gate.qubits);
        if (!pos) return;
        setPlacedGates(prev => packGates([...prev, {
            id: `${gate.id}-${crypto.randomUUID()}`,
            gate,
            depth: pos.depth,
            qubit: pos.qubit
        }]));
        setPreviewGate(null);
    }, [findGateById, getGridPosition, packGates, setPlacedGates]);

    const onShowPreview = useCallback((gate: CircuitGate['gate'], depth: number, qubit: number) => {
        const preview = {
            id: dragGateId || `${gate.id}-preview`,
            gate,
            depth,
            qubit
        };

        const packed = packGates([
            ...placedGates.filter(g => g.id !== dragGateId),
            preview
        ]);
        const finalPreview = packed.find(g => g.id === preview.id);

        setPreviewGate(finalPreview || preview);
    }, [dragGateId, packGates, placedGates]);

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