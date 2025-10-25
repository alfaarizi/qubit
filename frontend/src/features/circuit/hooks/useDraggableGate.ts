import React, {useState, useEffect, useCallback, useRef } from 'react';

import { dragState } from '@/lib/dragState';
import {GATE_CONFIG, GATES} from '@/features/gates/constants';
import type { Gate } from '@/features/gates/types';
import {createContiguousQubitArrays, getQubitSpan} from "@/features/gates/utils";

interface UseDraggableGateProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    maxDepth: number;
    setPlacedGates: (gates: Gate[] | ((prev: Gate[]) => Gate[]), options?: { skipHistory?: boolean }) => void;
    scrollContainerWidth?: number | null;
    injectGate: (gate: Gate, gates: Gate[]) => Gate[];
    moveGate: (gateId: string, gates: Gate[], targetDepth: number, startQubit: number) => Gate[];
    removeGate: (gateId: string, gates: Gate[]) => Gate[];
}

export function useDraggableGate({
    svgRef,
    numQubits,
    maxDepth,
    setPlacedGates,
    scrollContainerWidth,
    injectGate,
    moveGate,
    removeGate,
}: UseDraggableGateProps) {
    const [draggableGate, setDraggableGate] = useState<Gate | null>(null);
    const [dragGateId, setDragGateId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const dragPosRef = useRef<{ depth: number; qubit: number } | null>(null);

    const { gateSpacing } = GATE_CONFIG;

    const getGridPosition = useCallback((e: { clientX: number; clientY: number }, gateSpan: number = 1) => {
        if (!svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return {
            depth: Math.floor(x / gateSpacing),
            qubit: Math.max(0, Math.min(Math.round(y / gateSpacing - 0.5), numQubits - gateSpan)),
            x,
            y
        };
    }, [svgRef, gateSpacing, numQubits]);

    const isValidGridPosition = useCallback((e: { clientX: number; clientY: number }, gate: Gate): boolean => {
        const { span } = getQubitSpan(gate);
        const pos = getGridPosition(e, span);
        if (!pos) return false;
        // Check bounds
        const contentWidth = maxDepth * gateSpacing;
        const maxWidth = Math.min(scrollContainerWidth || contentWidth, contentWidth);
        const maxHeight = numQubits * gateSpacing;
        return pos.x >= 0 && pos.x <= maxWidth && pos.y >= 0 && pos.y <= maxHeight;
    }, [getGridPosition, maxDepth, gateSpacing, scrollContainerWidth, numQubits]);

    const hasDragPositionChanged = (pos: { depth: number; qubit: number }) => {
        return dragPosRef.current?.depth !== pos.depth || dragPosRef.current?.qubit !== pos.qubit;
    };

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
        if (!pos || totalQubits > numQubits) return;

        const newGate: Gate = {
            id: `${gate.id}-${crypto.randomUUID()}`,
            gate,
            depth: pos.depth,
            ...createContiguousQubitArrays(gate, pos.qubit),
            parents: [],
            children: [],
        };

        dragPosRef.current = { depth: pos.depth, qubit: pos.qubit };
        setDraggableGate(newGate);
        setPlacedGates(prev => injectGate(newGate, prev), { skipHistory: false });
    }, [draggableGate, getGridPosition, numQubits, setPlacedGates, injectGate])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!draggableGate) return;

        const { span } = getQubitSpan(draggableGate);
        const pos = getGridPosition(e, span);
        if (!pos || !hasDragPositionChanged(pos)) return;

        if (isValidGridPosition(e, draggableGate)) {
            dragPosRef.current = { depth: pos.depth, qubit: pos.qubit };
            setPlacedGates(prev => moveGate(draggableGate.id, prev, pos.depth, pos.qubit), { skipHistory: true });
        }
    }, [draggableGate, getGridPosition, isValidGridPosition, setPlacedGates, moveGate]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        if (!draggableGate) return;
        if (!isValidGridPosition(e, draggableGate)) {
            dragPosRef.current = null;
            setDraggableGate(null);
            setPlacedGates(prev => removeGate(draggableGate.id, prev), { skipHistory: true });
        }
    }, [draggableGate, isValidGridPosition, setPlacedGates, removeGate]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        dragPosRef.current = null;
        setDraggableGate(null);
    }, [dragPosRef]);

    const handleMouseDown = useCallback((gate: Gate, event: MouseEvent) => {
        if (event.button !== 0 || !svgRef.current) return;

        const { minQubit, span } = getQubitSpan(gate);
        const rect = svgRef.current.getBoundingClientRect();
        const x = gate.depth * gateSpacing + gateSpacing / 2;
        const y = minQubit * gateSpacing + gateSpacing / 2;

        setDraggableGate(gate);
        setDragGateId(gate.id);
        setDragOffset({
            x: event.clientX - (x + rect.left),
            y: event.clientY - (y + rect.top)
        });

        const cleanup = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('contextmenu', handleContextMenu);
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const pos = getGridPosition(moveEvent, span);
            if (!pos || !hasDragPositionChanged(pos)) return;
            // move gate if position is valid
            if (isValidGridPosition(moveEvent, gate)) {
                dragPosRef.current = { depth: pos.depth, qubit: pos.qubit };
                setPlacedGates(prev => moveGate(gate.id, prev, pos.depth, pos.qubit), { skipHistory: false });
            }
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            dragPosRef.current = null;
            if (!isValidGridPosition(upEvent, gate)) {
                setPlacedGates(prev => removeGate(gate.id, prev), { skipHistory: false });
            }
            setDraggableGate(null);
            setDragGateId(null);
            setDragOffset({ x: 0, y: 0 });
            cleanup();
        };

        const handleContextMenu = () => {
            // Cancel drag without removing the gate
            dragPosRef.current = null;
            setDraggableGate(null);
            setDragGateId(null);
            setDragOffset({ x: 0, y: 0 });
            cleanup();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('contextmenu', handleContextMenu, { once: true });
    }, [svgRef, gateSpacing, getGridPosition, setPlacedGates, moveGate, isValidGridPosition, removeGate]);

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