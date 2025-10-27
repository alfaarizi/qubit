import React, { useEffect} from 'react';
import * as d3 from 'd3';

import { GATE_CONFIG } from '@/features/gates/constants';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import { SELECTION_STYLES } from '@/features/circuit/hooks/useGateSelection';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';
import { getInvolvedQubits, getQubitSpan} from "@/features/gates/utils";

interface UseCircuitRendererProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    maxDepth: number;
    placedGates: (Gate | Circuit)[];
    draggableGateId?: string | null;
    selectedGateIds?: Set<string>;
    scrollContainerWidth?: number | null;
    handleMouseDown: (gate: Gate | Circuit, event: MouseEvent) => void;
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

        // Helper function to render a single gate
        const renderGate = (
            item: Gate,
            isPreview: boolean,
            isSelected: boolean,
            hasHitbox: boolean
        ) => {
            const { minQubit } = getQubitSpan(item);
            const x = item.depth * gateSpacing + gateSpacing / 2;
            const y = minQubit * gateSpacing + gateSpacing / 2;

            const group = svg.append('g')
                .datum(item)
                .attr('class', 'gate-element')
                .attr('data-gate-id', item.id)
                .attr('opacity', isPreview ? previewOpacity : 1)
                .style('cursor', isPreview ? 'default' : 'grab');

            const totalQubits = item.gate.numTargetQubits + item.gate.numControlQubits;

            if (totalQubits === 1) {
                const { textSize, borderWidth, borderRadius } = GATE_CONFIG.singleQubit;
                const qubitY = item.targetQubits[0] * gateSpacing + gateSpacing / 2;

                group.append('rect')
                    .attr('x', x - gateSize / 2)
                    .attr('y', qubitY - gateSize / 2)
                    .attr('width', gateSize)
                    .attr('height', gateSize)
                    .attr('class', 'fill-background')
                    .attr('rx', borderRadius)
                    .attr('pointer-events', isPreview ? 'none' : 'auto');

                group.append('rect')
                    .attr('x', x - gateSize / 2)
                    .attr('y', y - gateSize / 2)
                    .attr('width', gateSize)
                    .attr('height', gateSize)
                    .attr('fill', `${item.gate.color}${backgroundOpacity}`)
                    .attr('stroke', isSelected ? SELECTION_STYLES.strokeColor : item.gate.color)
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
                    .text(item.gate.symbol);
            } else {
                const { textSize, lineWidth, targetRadius, controlDotRadius } = GATE_CONFIG.multiQubit;
                const involvedQubits = getInvolvedQubits(item);
                const yFirst = involvedQubits[0] * gateSpacing + gateSpacing / 2;
                const yLast = involvedQubits[involvedQubits.length - 1] * gateSpacing + gateSpacing / 2;

                const strokeColor = isSelected ? SELECTION_STYLES.strokeColor : item.gate.color;
                const strokeWidth = isSelected ? SELECTION_STYLES.strokeWidth : lineWidth;

                const drawCircle = (cy: number, radius: number) => {
                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('class', 'fill-background');

                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('fill', `${item.gate.color}${backgroundOpacity}`)
                        .attr('stroke', strokeColor)
                        .attr('stroke-width', strokeWidth);
                };

                group.append('line')
                    .attr('x1', x).attr('y1', yFirst)
                    .attr('x2', x).attr('y2', yLast)
                    .attr('stroke', strokeColor)
                    .attr('stroke-width', strokeWidth);

                item.controlQubits.forEach((controlQubit: number) => {
                    const yControl = controlQubit * gateSpacing + gateSpacing / 2;
                    drawCircle(yControl, controlDotRadius);
                });

                item.targetQubits.forEach((targetQubit: number) => {
                    const yTarget = targetQubit * gateSpacing + gateSpacing / 2;
                    drawCircle(yTarget, targetRadius);
                });

                const textY = item.targetQubits[item.targetQubits.length - 1] * gateSpacing + gateSpacing / 2;
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
                    .text(item.gate.symbol);
            }

            // Add interaction hitbox
            if (hasHitbox && !isPreview) {
                const involvedQubits = getInvolvedQubits(item);
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
                    handleMouseDown(item, event);
                });
            }
            return group;
        };

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
        svg.selectAll('.circuit-element').remove();

        placedGates.forEach(item => {
            const isPreview = draggableGateId === item.id;
            const isSelected = selectedGateIds.has(item.id);
            if ('circuit' in item) {
                // render circuit
                const { circuit, depth, startQubit, id } = item;
                if (!circuit.gates.length) return;

                // Render internal gates (offset by circuit position)
                circuit.gates.forEach((g: Gate | Circuit) => {
                    if ('gate' in g) {
                        renderGate({
                            ...g,
                            depth: depth + g.depth,
                            targetQubits: g.targetQubits.map(q => q + startQubit),
                            controlQubits: g.controlQubits.map(q => q + startQubit),
                        }, isPreview, false, false);
                    }
                });

                // Calculate border bounds
                const depths = circuit.gates.map(g => g.depth);
                const qubits = circuit.gates.flatMap(g => getInvolvedQubits(g));
                const [minDepth, maxDepth] = [Math.min(...depths), Math.max(...depths)];
                const [minQubit, maxQubit] = [Math.min(...qubits), Math.max(...qubits)];
                const borderPad = 4;

                const group = svg.append('g')
                    .datum(item)
                    .attr('class', 'circuit-element')
                    .attr('data-gate-id', id)
                    .attr('opacity', isPreview ? previewOpacity : 1);

                const rectX = (depth + minDepth) * gateSpacing + gateSpacing / 2 - gateSize / 2 - borderPad;
                const rectY = (startQubit + minQubit) * gateSpacing + gateSpacing / 2 - gateSize / 2 - borderPad;
                const rectWidth = (maxDepth - minDepth) * gateSpacing + gateSize + borderPad * 2;
                const rectHeight = (maxQubit - minQubit) * gateSpacing + gateSize + borderPad * 2;

                group.append('rect')
                    .attr('x', rectX)
                    .attr('y', rectY)
                    .attr('width', rectWidth)
                    .attr('height', rectHeight)
                    .attr('fill', 'none')
                    .attr('stroke', isSelected ? SELECTION_STYLES.strokeColor : circuit.color)
                    .attr('stroke-width', isSelected ? SELECTION_STYLES.strokeWidth : 1)
                    .attr('pointer-events', isPreview ? 'none' : 'all')
                    .attr('cursor', 'grab');

                // Add circuit name label in top-right corner
                const maxChars = Math.floor((rectWidth * 0.75 - 8) / 6);
                const labelText = circuit.symbol.length > maxChars ? circuit.symbol.substring(0, maxChars - 3) + '...' : circuit.symbol;
                const labelWidth = labelText.length * 6 + 8;

                group.append('rect')
                    .attr('x', rectX + rectWidth - labelWidth)
                    .attr('y', rectY)
                    .attr('width', labelWidth)
                    .attr('height', 14)
                    .attr('fill', circuit.color);

                group.append('text')
                    .attr('x', rectX + rectWidth - 4)
                    .attr('y', rectY + 7)
                    .attr('text-anchor', 'end')
                    .attr('dominant-baseline', 'middle')
                    .attr('font-family', fontFamily)
                    .attr('class', 'text-xs fill-background')
                    .text(labelText);

                if (!isPreview) {
                    group.on('mousedown', (e: MouseEvent) => {
                        e.preventDefault();
                        handleMouseDown(item, e);
                    });
                }
            } else {
                // render gate
                renderGate(item, isPreview, isSelected, true);
            }
        });
    }, [
        svgRef, numQubits, maxDepth, placedGates, draggableGateId, scrollContainerWidth,
        gateSize, fontFamily, fontWeight, fontStyle, gateSpacing, backgroundOpacity, previewOpacity, footerHeight,
        handleMouseDown, selectedGateIds
    ]);
}