import React, { useState, useEffect, useCallback } from 'react';
import { dragState } from '@/lib/dragState';
import { GATES } from '@/features/gates/constants';
import type { CircuitGate } from '@/features/gates/types';
import { createContiguousQubitArrays } from "@/features/gates/utils";

interface UseDraggableGateProps {
    placedGates: CircuitGate[];
    setPlacedGates: React.Dispatch<React.SetStateAction<CircuitGate[]>>;
    getGridPosition: (e: { clientX: number; clientY: number }, gateQubits?: number) => { depth: number; qubit: number; y: number } | null;
    onUpdateGatePosition: (gateId: string, targetDepth: number, startQubit: number) => void;
    onRemoveGate: (gateId: string) => void;
}

export function useDraggableGate({
    placedGates,
    setPlacedGates,
    getGridPosition,
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
        const gate = findGateById(dragState.get());
        if (!gate) return;

        const totalQubits = gate.numTargetQubits + gate.numControlQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        const { targetQubits, controlQubits } = createContiguousQubitArrays(gate, pos.qubit);

        if (!previewGate) {
            setPreviewGate({
                id: `${gate.id}-${crypto.randomUUID()}`,
                gate,
                depth: pos.depth,
                targetQubits,
                controlQubits,
                parents: [],
                children: [],
                shape: null
            });
        }

        console.log('drag enter', previewGate);

        if (!previewGate) return;

        if (!placedGates.includes(previewGate)) {
            onRemoveGate(previewGate.id);
            setPlacedGates(prev => [...prev, previewGate]);
        }
        onUpdateGatePosition(previewGate.id, pos.depth, pos.qubit);
    }, [findGateById, getGridPosition, onRemoveGate, onUpdateGatePosition, placedGates, previewGate, setPlacedGates])

    // Drag from GatesPanel
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();


        if (!previewGate) return;

        const totalQubits = previewGate.gate.numTargetQubits + previewGate.gate.numControlQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        console.log('drag over', previewGate, placedGates);
        onUpdateGatePosition(previewGate.id, pos.depth, pos.qubit);
    }, [getGridPosition, onUpdateGatePosition, placedGates, previewGate]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const gate = findGateById(dragState.get());
        if (!gate) return;

        const totalQubits = gate.numControlQubits + gate.numTargetQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        const { targetQubits, controlQubits } = createContiguousQubitArrays(gate, pos.qubit);

        if (!previewGate) return;

        previewGate.depth = pos.depth;
        previewGate.targetQubits = targetQubits;
        previewGate.controlQubits = controlQubits;

        setPreviewGate(null);
    }, [findGateById, getGridPosition, previewGate]);

const onShowPreview = useCallback((gate: CircuitGate, depth: number, startQubit: number) => {
        const { targetQubits, controlQubits } = createContiguousQubitArrays(gate.gate, startQubit);
        gate.depth = depth;
        gate.targetQubits = targetQubits;
        gate.controlQubits = controlQubits;
        return setPreviewGate(gate);
    }, []);


    const onHidePreview = useCallback(() => {
        if (!previewGate) return;
        console.log('leaving', previewGate);
        onRemoveGate(previewGate.id);
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