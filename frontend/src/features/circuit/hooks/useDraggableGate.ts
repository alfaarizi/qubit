import React, {useCallback, useEffect, useRef, useState} from 'react';

import {dragState} from '@/lib/dragState';
import {GATE_CONFIG, GATES} from '@/features/gates/constants';
import type {Gate} from '@/features/gates/types';
import type {Circuit} from '@/features/circuit/types';
import {createContiguousQubitArrays, getInvolvedQubits, getQubitSpan} from "@/features/gates/utils";
import {useCircuitTemplates} from '@/features/circuit/store/CircuitTemplatesStore';

interface UseDraggableGateProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    maxDepth: number;
    setPlacedGates: (gates: (Gate | Circuit)[] | ((prev: (Gate | Circuit)[]) => (Gate | Circuit)[]), options?: { skipHistory?: boolean }) => void;
    scrollContainerWidth?: number | null;
    injectGate: (gate: Gate | Circuit, gates: (Gate | Circuit)[]) => (Gate | Circuit)[];
    moveGate: (gateId: string, gates: (Gate | Circuit)[], targetDepth: number, startQubit: number) => (Gate | Circuit)[];
    removeGate: (gateId: string, gates: (Gate | Circuit)[]) => (Gate | Circuit)[];
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
    const [draggableGate, setDraggableGate] = useState<Gate | Circuit | null>(null);
    const [dragGateId, setDragGateId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const dragPosRef = useRef<{ depth: number; qubit: number } | null>(null);

    const { gateSpacing } = GATE_CONFIG;
    const { getCircuit } = useCircuitTemplates();

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

    const isValidGridPosition = useCallback((e: { clientX: number; clientY: number }, item: Gate | Circuit): boolean => {
        const { span } = getQubitSpan(item);
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

        const dragData = dragState.get();
        if (!dragData) return;

        let newItem: Gate | Circuit;
        let span: number;

        // Handle circuit
        if (dragData.type === 'circuit') {
            const circuitInfo = getCircuit(dragData.id);
            if (!circuitInfo) return;

            const involvedQubits = circuitInfo.gates.flatMap(g => getInvolvedQubits(g));
            span = Math.max(...involvedQubits) + 1;
            const pos = getGridPosition(e, span);
            if (!pos || span > numQubits) return;

            newItem = {
                id: `${circuitInfo.symbol}-${crypto.randomUUID()}`,
                circuit: circuitInfo,
                depth: pos.depth,
                startQubit: pos.qubit,
                parents: [],
                children: []
            };
            dragPosRef.current = pos;
        } else {
            // Handle gate
            const gate = GATES.find(g => g.id === dragData.id);
            if (!gate) return;

            span = gate.numControlQubits + gate.numTargetQubits;
            const pos = getGridPosition(e, span);
            if (!pos || span > numQubits) return;

            newItem = {
                id: `${gate.symbol}-${crypto.randomUUID()}`,
                gate,
                depth: pos.depth,
                ...createContiguousQubitArrays(gate, pos.qubit),
                parents: [],
                children: []
            };
            dragPosRef.current = pos;
        }

        setDraggableGate(newItem);
        setPlacedGates(prev => injectGate(newItem, prev), { skipHistory: false });
    }, [draggableGate, getGridPosition, numQubits, setPlacedGates, injectGate, getCircuit])

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

    const handleMouseDown = useCallback((item: Gate | Circuit, event: MouseEvent) => {
        if (event.button !== 0 || !svgRef.current) return;

        const { minQubit, span } = getQubitSpan(item);
        const rect = svgRef.current.getBoundingClientRect();

        // Calculate drag offset based on where user actually clicked, not minQubit
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const gateX = item.depth * gateSpacing + gateSpacing / 2;
        const gateY = minQubit * gateSpacing + gateSpacing / 2;

        setDraggableGate(item);
        setDragGateId(item.id);
        setDragOffset({
            x: mouseX - gateX,
            y: mouseY - gateY
        });

        const cleanup = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('contextmenu', handleContextMenu);
        };

        const resetDragState = () => {
            dragPosRef.current = null;
            setDraggableGate(null);
            setDragGateId(null);
            setDragOffset({ x: 0, y: 0 });
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const pos = getGridPosition(moveEvent, span);
            if (!pos || !hasDragPositionChanged(pos)) return;
            if (isValidGridPosition(moveEvent, item)) {
                dragPosRef.current = { depth: pos.depth, qubit: pos.qubit };
                setPlacedGates(prev => moveGate(item.id, prev, pos.depth, pos.qubit), { skipHistory: false });
            }
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            if (!isValidGridPosition(upEvent, item)) {
                setPlacedGates(prev => removeGate(item.id, prev), { skipHistory: false });
            }
            resetDragState();
            cleanup();
        };

        const handleContextMenu = () => {
            resetDragState();
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