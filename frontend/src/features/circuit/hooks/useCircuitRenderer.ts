import React, { useEffect} from 'react';
import * as d3 from 'd3';

import { GATE_CONFIG } from '@/features/gates/constants';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import { SELECTION_STYLES } from '@/features/circuit/hooks/useGateSelection';
import type { Gate } from '@/features/gates/types';
import { getInvolvedQubits, getQubitSpan} from "@/features/gates/utils";

interface UseCircuitRendererProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    maxDepth: number;
    placedGates: Gate[];
    draggableGateId?: string | null;
    selectedGateIds?: Set<string>;
    scrollContainerWidth?: number | null;
    handleMouseDown: (gate: Gate, event: MouseEvent) => void;
}

export function useCircuitRenderer({
    svgRef,
    numQubits,
    maxDepth,
    placedGates,
    draggableGateId = '',
    selectedGateIds = new Set(),
    scrollContainerWidth,
    handleMouseDown,
}: UseCircuitRendererProps) {
    const { footerHeight } = CIRCUIT_CONFIG;
    const { fontFamily, fontWeight, fontStyle, gateSize, gateSpacing, backgroundOpacity, previewOpacity } = GATE_CONFIG;

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

        placedGates.forEach(placedGate => {
            const { id, gate, depth, targetQubits, controlQubits } = placedGate;
            const { minQubit } = getQubitSpan(placedGate);
            const isPreview = draggableGateId === id;
            const isSelected = selectedGateIds.has(id);

            const x = depth * gateSpacing + gateSpacing / 2;
            const y = minQubit * gateSpacing + gateSpacing / 2;

            const group = svg.append('g')
                .datum(placedGate)
                .attr('class', 'gate-element')
                .attr('data-gate-id', id)
                .attr('opacity', isPreview ? previewOpacity : 1)
                .style('cursor', isPreview ? 'default' : 'grab');

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
                    .attr('stroke', isSelected ? SELECTION_STYLES.strokeColor : gate.color)
                    .attr('stroke-width', isSelected ? SELECTION_STYLES.strokeWidth : borderWidth)
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
                
                // Get all involved qubits (both control and target) for proper rendering
                const involvedQubits = getInvolvedQubits(placedGate);
                const yFirst = involvedQubits[0] * gateSpacing + gateSpacing / 2;
                const yLast = involvedQubits[involvedQubits.length - 1] * gateSpacing + gateSpacing / 2;

                const strokeColor = isSelected ? SELECTION_STYLES.strokeColor : gate.color;
                const strokeWidth = isSelected ? SELECTION_STYLES.strokeWidth : lineWidth;

                const drawCircle = (cy: number, radius: number) => {
                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('class', 'fill-background');

                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('fill', `${gate.color}${backgroundOpacity}`)
                        .attr('stroke', strokeColor)
                        .attr('stroke-width', strokeWidth);
                };

                // Draw vertical line spanning all involved qubits
                group.append('line')
                    .attr('x1', x).attr('y1', yFirst)
                    .attr('x2', x).attr('y2', yLast)
                    .attr('stroke', strokeColor)
                    .attr('stroke-width', strokeWidth);

                // Draw control dots on their specific qubits
                controlQubits.forEach(controlQubit => {
                    const yControl = controlQubit * gateSpacing + gateSpacing / 2;
                    drawCircle(yControl, controlDotRadius);
                });

                // Draw target circles on their specific qubits
                targetQubits.forEach(targetQubit => {
                    const yTarget = targetQubit * gateSpacing + gateSpacing / 2;
                    drawCircle(yTarget, targetRadius);
                });

                // Position text at the last target qubit
                const textY = targetQubits[targetQubits.length - 1] * gateSpacing + gateSpacing / 2;
                
                group.append('text')
                    .attr('x', x)
                    .attr('y', textY)
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
                // Calculate hitbox based on all involved qubits for non-contiguous gates
                const involvedQubits = getInvolvedQubits(placedGate);
                const hitboxYFirst = involvedQubits[0] * gateSpacing + gateSpacing / 2;
                const hitboxYLast = involvedQubits[involvedQubits.length - 1] * gateSpacing + gateSpacing / 2;
                const hitboxHeight = hitboxYLast - hitboxYFirst + gateSize;

                group.append('rect')
                    .attr('x', x - gateSize / 2)
                    .attr('y', hitboxYFirst - gateSize / 2)
                    .attr('width', gateSize)
                    .attr('height', hitboxHeight)
                    .attr('fill', 'transparent')
                    .attr('cursor', 'grab');

                group.on('mousedown', function(event) {
                    event.preventDefault();
                    handleMouseDown(placedGate, event);
                });
            }
        });
    }, [
        svgRef, numQubits, maxDepth, placedGates, draggableGateId, scrollContainerWidth,
        gateSize, fontFamily, fontWeight, fontStyle, gateSpacing, backgroundOpacity, previewOpacity, footerHeight,
        handleMouseDown, selectedGateIds
    ]);
}