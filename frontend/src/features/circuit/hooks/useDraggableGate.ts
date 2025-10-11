import React, {useState, useEffect, useCallback } from 'react';

import { dragState } from '@/lib/dragState';
import {GATE_CONFIG, GATES} from '@/features/gates/constants';
import type { CircuitGate } from '@/features/gates/types';
import {createContiguousQubitArrays, getQubitSpan} from "@/features/gates/utils";

interface UseDraggableGateProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    maxDepth: number;
    placedGates: CircuitGate[];
    setPlacedGates: React.Dispatch<React.SetStateAction<CircuitGate[]>>;
    previewGate: CircuitGate | null;
    setPreviewGate: React.Dispatch<React.SetStateAction<CircuitGate | null>>;
    injectGate: (circuitGate: CircuitGate, gates: CircuitGate[]) => CircuitGate[];
    moveGate: (gateId: string, targetDepth: number, startQubit: number) => void;
    removeGate: (gateId: string) => void;
}

export function useDraggableGate({
    svgRef,
    numQubits,
    maxDepth,
    placedGates,
    setPlacedGates,
    previewGate,
    setPreviewGate,
    injectGate,
    moveGate,
    removeGate,
}: UseDraggableGateProps) {
    const [dragGateId, setDragGateId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

    const { gateSpacing } = GATE_CONFIG;

    const getGridPosition = useCallback((e: { clientX: number; clientY: number }, gateQubits: number = 1) => {
        if (!svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return {
            depth: Math.floor(x / gateSpacing),
            qubit: Math.max(0, Math.min(Math.floor(y / gateSpacing), numQubits - gateQubits)),
            x,
            y
        };
    }, [svgRef, gateSpacing, numQubits]);

    const isValidGridPosition = useCallback((e: { clientX: number; clientY: number }, gateQubits: number): boolean => {
        const pos = getGridPosition(e, gateQubits);
        const maxX = maxDepth * gateSpacing;
        const maxY = numQubits * gateSpacing;
        return pos !== null && pos.y >= 0 && pos.y <= maxY && pos.x >= 0 && pos.x <= maxX;
    }, [getGridPosition, gateSpacing, numQubits, maxDepth]);

    // Show floating preview at cursor while dragging
    useEffect(() => {
        if (!dragGateId) {
            setCursorPos(null);
            return;
        }
        const moveCursor = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
        document.addEventListener('mousemove', moveCursor);
        return () => {
            document.removeEventListener('mousemove', moveCursor);
        };
    }, [dragGateId]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        if (previewGate) return;

        const gateId = dragState.get();
        const gate = GATES.find(g => g.id === gateId) || null;
        if (!gate) return;

        const totalQubits = gate.numTargetQubits + gate.numControlQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        const newPreview: CircuitGate = {
            id: `${gate.id}-${crypto.randomUUID()}`,
            gate,
            depth: pos.depth,
            ...createContiguousQubitArrays(gate, pos.qubit),
            parents: [],
            children: [],
        };

        setPreviewGate(newPreview);
        setPlacedGates(prev => injectGate(newPreview, prev));
    }, [getGridPosition, injectGate, previewGate, setPlacedGates, setPreviewGate])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!previewGate) return;

        const totalQubits = previewGate.gate.numTargetQubits + previewGate.gate.numControlQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        moveGate(previewGate.id, pos.depth, pos.qubit);
    }, [getGridPosition, moveGate, previewGate]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        if (!previewGate) return;
        const totalQubits = previewGate.gate.numTargetQubits + previewGate.gate.numControlQubits;
        if (!isValidGridPosition(e, totalQubits)) {
            setPreviewGate(null);
            removeGate(previewGate.id)
        }
    }, [isValidGridPosition, previewGate, removeGate, setPreviewGate]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setPreviewGate(null);
    }, [setPreviewGate]);

    const handleMouseDown = useCallback((gate: CircuitGate, event: MouseEvent) => {
        if (!svgRef.current) return;

        const { startQubit } = getQubitSpan(gate);
        const rect = svgRef.current.getBoundingClientRect();
        const x = gate.depth * gateSpacing + gateSpacing / 2;
        const y = startQubit * gateSpacing + gateSpacing / 2;

        setDragGateId(gate.id);
        setDragOffset({
            x: event.clientX - (x + rect.left),
            y: event.clientY - (y + rect.top)
        });

        // Show preview
        const previewGate: CircuitGate = {
            ...gate,
            ...createContiguousQubitArrays(gate.gate, startQubit)
        };
        setPreviewGate(previewGate);

        const totalQubits = previewGate.gate.numControlQubits + previewGate.gate.numTargetQubits;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const pos = getGridPosition(moveEvent, totalQubits);
            if (!pos) return;
            moveGate(previewGate.id, pos.depth, pos.qubit);
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            if (!isValidGridPosition(upEvent, totalQubits)) {
                removeGate(previewGate.id);
            }
            setPreviewGate(null);
            setDragGateId(null);
            setDragOffset({ x: 0, y: 0 });
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [svgRef, gateSpacing, getGridPosition, moveGate, isValidGridPosition, setPreviewGate, removeGate]);

    const dragGate = dragGateId ? placedGates.find(g => g.id === dragGateId)?.gate : null;

    return {
        dragGate,
        dragOffset,
        cursorPos,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleMouseDown,
    };
}