import React, { useState, useEffect, useCallback } from 'react';
import { dragState } from '@/lib/dragState';
import { GATES } from '@/features/gates/constants';
import type { CircuitGate } from '@/features/gates/types';

interface UseDraggableGateProps {
    placedGates: CircuitGate[];
    setPlacedGates: React.Dispatch<React.SetStateAction<CircuitGate[]>>;
    getGridPosition: (e: { clientX: number; clientY: number }) => { depth: number; qubit: number; y: number } | null;
    isValid: (depth: number, qubit: number, qubits: number, excludeId?: string) => boolean;
}

export function useDraggableGate({
    placedGates,
    setPlacedGates,
    getGridPosition,
    isValid
}: UseDraggableGateProps) {
    const [previewGate, setPreviewGate] = useState<CircuitGate | null>(null);
    const [dragGateId, setDragGateId] = useState<string | null>(null);
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
        const pos = getGridPosition(e);
        if (!pos) return;
        if (isValid(pos.depth, pos.qubit, gate.qubits)) {
            setPreviewGate({
                id: `${gate.name}-preview`,
                gate,
                depth: pos.depth,
                qubit: pos.qubit,
            });
        } else {
            setPreviewGate(null);
        }
    }, [findGateById, getGridPosition, isValid]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const gate = findGateById(dragState.get());
        if (!gate) return;
        const pos = getGridPosition(e);
        if (!pos) return;
        if (isValid(pos.depth, pos.qubit, gate.qubits)) {
            setPlacedGates(prev => [...prev, {
                id: `${gate.id}-${crypto.randomUUID()}`,
                gate,
                depth: pos.depth,
                qubit: pos.qubit,
                isPreview: false
            }]);
        }
        setPreviewGate(null);
    }, [findGateById, getGridPosition, isValid, setPlacedGates]);

    const onShowPreview = useCallback((gate: CircuitGate['gate'], depth: number, qubit: number) => {
        setPreviewGate({
            id: dragGateId || `${gate.name}-preview`,
            gate,
            depth,
            qubit,
        });
    }, [dragGateId]);

    const onHidePreview = useCallback(() => {
        setPreviewGate(null);
    }, []);

    const onStartDragging = useCallback((gateId: string) => {
        setDragGateId(gateId);
    }, []);

    const onEndDragging = useCallback(() => {
        setPreviewGate(null);
        setDragGateId(null);
    }, []);

    const floatingGate = dragGateId ? placedGates.find(g => g.id === dragGateId)?.gate : null;

    return {
        dragGateId,
        previewGate,
        floatingGate,
        cursorPos,
        handleDragOver,
        handleDrop,
        onShowPreview,
        onHidePreview,
        onStartDragging,
        onEndDragging
    };
}