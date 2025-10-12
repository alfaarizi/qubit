import React, {useState, useEffect, useCallback } from 'react';

import { dragState } from '@/lib/dragState';
import {GATE_CONFIG, GATES} from '@/features/gates/constants';
import type { Gate } from '@/features/gates/types';
import {createContiguousQubitArrays, getQubitSpan} from "@/features/gates/utils";

interface UseDraggableGateProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    maxDepth: number;
    setPlacedGates: React.Dispatch<React.SetStateAction<Gate[]>>;
    injectGate: (gate: Gate, gates: Gate[]) => Gate[];
    moveGate: (gateId: string, targetDepth: number, startQubit: number) => void;
    removeGate: (gateId: string) => void;
}

export function useDraggableGate({
    svgRef,
    numQubits,
    maxDepth,
    setPlacedGates,
    injectGate,
    moveGate,
    removeGate,
}: UseDraggableGateProps) {
    const [draggableGate, setDraggableGate] = useState<Gate | null>(null);
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

    useEffect(() => {
        const cleanup = () => {
            setDraggableGate(null);
        };
        document.addEventListener('dragend', cleanup);
        return () => document.removeEventListener('dragend', cleanup);
    }, []);

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
        if (draggableGate) return;

        const gateId = dragState.get();
        const gate = GATES.find(g => g.id === gateId) || null;
        if (!gate) return;

        const totalQubits = gate.numTargetQubits + gate.numControlQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        const newPreview: Gate = {
            id: `${gate.id}-${crypto.randomUUID()}`,
            gate,
            depth: pos.depth,
            ...createContiguousQubitArrays(gate, pos.qubit),
            parents: [],
            children: [],
        };

        setDraggableGate(newPreview);
        setPlacedGates(prev => injectGate(newPreview, prev));
    }, [getGridPosition, injectGate, draggableGate, setPlacedGates, setDraggableGate])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!draggableGate) return;

        const totalQubits = draggableGate.gate.numTargetQubits + draggableGate.gate.numControlQubits;
        const pos = getGridPosition(e, totalQubits);
        if (!pos) return;

        moveGate(draggableGate.id, pos.depth, pos.qubit);
    }, [getGridPosition, moveGate, draggableGate]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        if (!draggableGate) return;
        const totalQubits = draggableGate.gate.numTargetQubits + draggableGate.gate.numControlQubits;
        if (!isValidGridPosition(e, totalQubits)) {
            setDraggableGate(null);
            removeGate(draggableGate.id)
        }
    }, [isValidGridPosition, draggableGate, removeGate, setDraggableGate]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDraggableGate(null);
    }, [setDraggableGate]);

    const handleMouseDown = useCallback((gate: Gate, event: MouseEvent) => {
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
        setDraggableGate(gate);

        const totalQubits = gate.gate.numControlQubits + gate.gate.numTargetQubits;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const pos = getGridPosition(moveEvent, totalQubits);
            if (!pos) return;
            moveGate(gate.id, pos.depth, pos.qubit);
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            if (!isValidGridPosition(upEvent, totalQubits)) {
                removeGate(gate.id);
            }
            setDraggableGate(null);
            setDragGateId(null);
            setDragOffset({ x: 0, y: 0 });
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [svgRef, gateSpacing, getGridPosition, moveGate, isValidGridPosition, setDraggableGate, removeGate]);

    return {
        draggableGate,
        dragOffset,
        cursorPos,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleMouseDown,
    };
}