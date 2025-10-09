import React, { useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import type { CircuitGate } from '@/features/gates/types';
import { GATE_CONFIG } from '@/features/gates/constants';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import { getQubitSpan } from "@/features/gates/utils";

interface UseCircuitRendererProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    placedGates: CircuitGate[];
    numQubits: number;
    maxDepth: number;
    gatesToRender?: CircuitGate[];
    previewGate?: CircuitGate | null;
    scrollContainerWidth?: number;
    onUpdateGatePosition?: (gateId: string, targetDepth: number, qubit: number) => void;
    onRemoveGate?: (gateId: string) => void;
    onShowPreview?: (gate: CircuitGate['gate'], depth: number, qubit: number) => void;
    onHidePreview?: () => void;
    onStartDragging?: (gateId: string, offset: { x: number; y: number }) => void;
    onEndDragging?: () => void;
}

export function useCircuitRenderer({
    svgRef,
    placedGates,
    numQubits,
    maxDepth,
    gatesToRender = [],
    previewGate = null,
    scrollContainerWidth = 0,
    onStartDragging = () => {},
    onUpdateGatePosition = () => {},
    onRemoveGate = () => {},
    onShowPreview = () => {},
    onHidePreview = () => {},
    onEndDragging = () => {}
}: UseCircuitRendererProps) {
    const { footerHeight } = CIRCUIT_CONFIG;
    const { fontFamily, fontWeight, fontStyle, gateSize, gateSpacing, backgroundOpacity, previewOpacity } = GATE_CONFIG;

    // ========== Logic Functions ==========

    const getGridPosition = useCallback((e: { clientX: number; clientY: number }, gateQubits: number = 1) => {
        if (!svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return {
            depth: Math.floor(x / gateSpacing),
            qubit: Math.max(0, Math.min(Math.floor(y / gateSpacing), numQubits - gateQubits)),
            y
        };
    }, [svgRef, gateSpacing, numQubits]);

    const hasCollision = useCallback((
        depth: number,
        startQubit: number,
        endQubit: number,
        excludeId?: string
    ) => {
        return placedGates.some(pg => {
            if (pg.id === excludeId) return false;
            if (pg.depth !== depth) return false;
            const { startQubit: existingStart, endQubit: existingEnd } = getQubitSpan(pg);
            return !(endQubit < existingStart || existingEnd < startQubit);
        });
    }, [placedGates]);

    const findNextAvailableDepth = useCallback((
        startQubit: number,
        endQubit: number,
        excludeId?: string
    ) => {
        let depth = 0;
        while (hasCollision(depth, startQubit, endQubit, excludeId)) {
            depth++;
        }
        return depth;
    }, [hasCollision]);

    // ========== Rendering Effect ==========

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        // Draw circuit background
        svg.select('.circuit-background').remove();
        const background = svg.insert('g', ':first-child')
            .attr('class', 'circuit-background');

        const contentWidth = maxDepth * gateSpacing;
        const svgWidth = Math.max(scrollContainerWidth || contentWidth, contentWidth);
        const svgHeight = numQubits * gateSpacing + footerHeight;

        svg.attr('width', svgWidth).attr('height', svgHeight);

        // Qubit lines
        for (let i = 0; i < numQubits; i++) {
            background.append('line')
                .attr('x1', 0).attr('y1', i * gateSpacing + gateSpacing / 2)
                .attr('x2', svgWidth).attr('y2', i * gateSpacing + gateSpacing / 2)
                .attr('class', 'stroke-border circuit-line')
                .attr('stroke-width', 2);
        }

        // Depth markers
        const markersY = numQubits * gateSpacing + footerHeight / 2;
        for (let i = 1; i <= maxDepth; i++) {
            background.append('text')
                .attr('x', (i - 1) * gateSpacing + gateSpacing / 2)
                .attr('y', markersY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('class', 'fill-muted-foreground text-xs font-mono depth-marker')
                .text(i);
        }

        // Draw gates
        svg.selectAll('.gate-element').remove();

        gatesToRender.forEach(draggableGate => {
            const { id, gate, depth, targetQubits, controlQubits } = draggableGate;
            const { startQubit, endQubit } = getQubitSpan(draggableGate);
            const isPreview = id === previewGate?.id;

            const x = depth * gateSpacing + gateSpacing / 2;
            const y = startQubit * gateSpacing + gateSpacing / 2;

            const group = svg.append('g')
                .attr('class', 'gate-element')
                .attr('data-gate-id', id)
                .attr('opacity', isPreview ? previewOpacity : 1)
                .style('cursor', isPreview ? 'default' : 'grab');

            if (!isPreview) { // Temporary for debugging purposes, this shows the target and control qubits of the gate
                const labelText = controlQubits.length > 0
                    ? `C:[${controlQubits}] T:[${targetQubits}]`
                    : `Q:${targetQubits[0]}`;
                const labelY = endQubit * gateSpacing + gateSpacing + gateSpacing / 4;
                group.append('text')
                    .attr('x', x)
                    .attr('y', labelY)
                    .attr('text-anchor', 'middle')
                    .attr('class', 'text-xs fill-foreground font-mono')
                    .attr('pointer-events', 'none')
                    .style('font-size', '10px')
                    .text(labelText);
            }

            const totalQubits = gate.numTargetQubits + gate.numControlQubits;
            if (totalQubits === 1) {
                const { textSize, borderWidth, borderRadius } = GATE_CONFIG.singleQubit;
                const qubitY = targetQubits[0] * gateSpacing + gateSpacing / 2;

                group.append('rect')
                    .attr('x', x - gateSize / 2)
                    .attr('y', qubitY - gateSize / 2)
                    .attr('width', gateSize)
                    .attr('height', gateSize)
                    .attr('fill', 'white')
                    .attr('class', 'fill-background')
                    .attr('rx', borderRadius)
                    .attr('pointer-events', isPreview ? 'none' : 'auto');

                group.append('rect')
                    .attr('x', x - gateSize / 2)
                    .attr('y', y - gateSize / 2)
                    .attr('width', gateSize)
                    .attr('height', gateSize)
                    .attr('fill', `${gate.color}${backgroundOpacity}`)
                    .attr('stroke', gate.color)
                    .attr('stroke-width', borderWidth)
                    .attr('rx', borderRadius)
                    .attr('pointer-events', isPreview ? 'none' : 'auto');

                group.append('text')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('font-family', fontFamily)
                    .attr('font-weight', fontWeight)
                    .attr('font-style', fontStyle)
                    .attr('class', `${textSize} fill-foreground`)
                    .attr('pointer-events', 'none')
                    .text(gate.symbol);

            } else if (totalQubits > 1) {
                const { textSize, lineWidth, targetRadius, controlDotRadius } = GATE_CONFIG.multiQubit;
                const yFirst = startQubit * gateSpacing + gateSpacing / 2;
                const yLast = endQubit * gateSpacing + gateSpacing / 2;

                const drawCircle = (cy: number, radius: number) => {
                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('class', 'fill-background');

                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('fill', `${gate.color}${backgroundOpacity}`)
                        .attr('stroke', gate.color)
                        .attr('stroke-width', lineWidth);
                };

                // Draw line spanning all qubits
                group.append('line')
                    .attr('x1', x).attr('y1', yFirst)
                    .attr('x2', x).attr('y2', yLast)
                    .attr('stroke', gate.color)
                    .attr('stroke-width', lineWidth);

                // Draw control dots
                controlQubits.forEach(controlQubit => {
                    const yControl = controlQubit * gateSpacing + gateSpacing / 2;
                    drawCircle(yControl, controlDotRadius);
                });

                // Draw target on last qubit
                targetQubits.forEach(targetQubit => {
                    const yTarget = targetQubit * gateSpacing + gateSpacing / 2;
                    drawCircle(yTarget, targetRadius);
                });

                group.append('text')
                    .attr('x', x)
                    .attr('y', yLast)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('font-family', fontFamily)
                    .attr('font-weight', fontWeight)
                    .attr('font-style', fontStyle)
                    .attr('class', `${textSize} fill-foreground`)
                    .attr('pointer-events', 'none')
                    .text(gate.symbol);
            }

            // Add interaction for placed gates
            if (!isPreview) {

                const hitboxHeight = (endQubit - startQubit + 1) * gateSpacing;
                group.append('rect')
                    .attr('x', x - gateSize / 2)
                    .attr('y', y - gateSize / 2)
                    .attr('width', gateSize)
                    .attr('height', hitboxHeight)
                    .attr('fill', 'transparent')
                    .attr('cursor', 'grab');

                group.on('mousedown', function(event) {
                    event.preventDefault();

                    const rect = svgRef.current!.getBoundingClientRect();
                    const offset = {
                        x: event.clientX - (x + rect.left),
                        y: event.clientY - (y + rect.top)
                    };

                    onStartDragging(id, offset);
                    onShowPreview(gate, depth, startQubit);

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                        const totalQubits = gate.numControlQubits + gate.numTargetQubits;
                        const pos = getGridPosition(moveEvent, totalQubits);
                        if (!pos) return;
                        const nextDepth = findNextAvailableDepth(pos.qubit, pos.qubit + totalQubits - 1, id);
                        onShowPreview(gate, nextDepth, pos.qubit);
                    };

                    const handleMouseUp = (upEvent: MouseEvent) => {
                        const totalQubits = gate.numControlQubits + gate.numTargetQubits;
                        const pos = getGridPosition(upEvent, totalQubits);
                        if (!pos) return;
                        if (pos.y < 0 || pos.y > numQubits * gateSpacing) {
                            onRemoveGate(id);
                        } else {
                            const nextDepth = findNextAvailableDepth(pos.qubit, pos.qubit + totalQubits - 1, id);
                            onUpdateGatePosition(id, nextDepth, pos.qubit);
                        }
                        onEndDragging();
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                });
            }
        });
    }, [svgRef, numQubits, maxDepth, gatesToRender, previewGate, scrollContainerWidth, getGridPosition, findNextAvailableDepth, hasCollision,
        gateSize, fontFamily, fontWeight, fontStyle, gateSpacing, backgroundOpacity, previewOpacity, footerHeight,
        onStartDragging, onUpdateGatePosition, onRemoveGate, onShowPreview, onHidePreview, onEndDragging]);

    return {
        getGridPosition,
        findNextAvailableDepth,
    };
}