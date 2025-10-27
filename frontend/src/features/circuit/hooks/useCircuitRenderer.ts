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
    showNestedCircuitBorders?: boolean;
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
    showNestedCircuitBorders = true,
    handleMouseDown,
}: UseCircuitRendererProps) {
    const { footerHeight } = CIRCUIT_CONFIG;
    const { fontFamily, fontWeight, fontStyle, gateSize, gateSpacing, qubitSpacing, backgroundOpacity, previewOpacity } = GATE_CONFIG;
    
    const borderPadding = 4;
    const labelHeight = 16;
    const labelCharWidth = 6;
    const labelPadding = 8;
    const labelOffsetX = 0;

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        // render a single gate
        const renderGate = (
            gate: Gate,
            isPreview: boolean,
            isSelected: boolean,
            hasHitbox: boolean
        ) => {
            const { minQubit } = getQubitSpan(gate);
            const x = gate.depth * gateSpacing + gateSpacing / 2;
            const y = minQubit * qubitSpacing + qubitSpacing / 2;

            const group = svg.append('g')
                .datum(gate)
                .attr('class', 'gate-element')
                .attr('data-gate-id', gate.id)
                .attr('opacity', isPreview ? previewOpacity : 1)
                .style('cursor', isPreview ? 'default' : 'grab');

            const totalQubits = gate.gate.numTargetQubits + gate.gate.numControlQubits;

            if (totalQubits === 1) {
                const { textSize, borderWidth, borderRadius } = GATE_CONFIG.singleQubit;
                const qubitY = gate.targetQubits[0] * qubitSpacing + qubitSpacing / 2;

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
                    .attr('fill', `${gate.gate.color}${backgroundOpacity}`)
                    .attr('stroke', isSelected ? SELECTION_STYLES.strokeColor : gate.gate.color)
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
                    .text(gate.gate.symbol);
            } else {
                const { textSize, lineWidth, targetRadius, controlDotRadius } = GATE_CONFIG.multiQubit;
                const involvedQubits = getInvolvedQubits(gate);
                const yFirst = involvedQubits[0] * qubitSpacing + qubitSpacing / 2;
                const yLast = involvedQubits[involvedQubits.length - 1] * qubitSpacing + qubitSpacing / 2;

                const strokeColor = isSelected ? SELECTION_STYLES.strokeColor : gate.gate.color;
                const strokeWidth = isSelected ? SELECTION_STYLES.strokeWidth : lineWidth;

                const drawCircle = (cy: number, radius: number) => {
                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('class', 'fill-background');

                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('fill', `${gate.gate.color}${backgroundOpacity}`)
                        .attr('stroke', strokeColor)
                        .attr('stroke-width', strokeWidth);
                };

                group.append('line')
                    .attr('x1', x).attr('y1', yFirst)
                    .attr('x2', x).attr('y2', yLast)
                    .attr('stroke', strokeColor)
                    .attr('stroke-width', strokeWidth);

                gate.controlQubits.forEach((controlQubit: number) => {
                    const yControl = controlQubit * qubitSpacing + qubitSpacing / 2;
                    drawCircle(yControl, controlDotRadius);
                });

                gate.targetQubits.forEach((targetQubit: number) => {
                    const yTarget = targetQubit * qubitSpacing + qubitSpacing / 2;
                    drawCircle(yTarget, targetRadius);
                });

                const textY = gate.targetQubits[gate.targetQubits.length - 1] * qubitSpacing + qubitSpacing / 2;
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
                    .text(gate.gate.symbol);
            }

            // add interaction hitbox
            if (hasHitbox && !isPreview) {
                const involvedQubits = getInvolvedQubits(gate);
                const hitboxYFirst = involvedQubits[0] * qubitSpacing + qubitSpacing / 2;
                const hitboxYLast = involvedQubits[involvedQubits.length - 1] * qubitSpacing + qubitSpacing / 2;
                const hitboxHeight = hitboxYLast - hitboxYFirst + gateSize;

                group.append('rect')
                    .attr('x', x - gateSize / 2)
                    .attr('y', hitboxYFirst - gateSize / 2)
                    .attr('width', gateSize)
                    .attr('height', hitboxHeight)
                    .attr('fill', 'transparent')
                    .attr('cursor', 'grab')
                    .on('mousedown', (event) => {
                        event.preventDefault();
                        handleMouseDown(gate, event);
                    });
            }
        };

        const renderCircuitBorder = (
            circ: Circuit,
            depthOffset: number,
            qubitOffset: number,
            isPreview: boolean,
            isSelected: boolean,
            isTopCircuit: boolean,
            showLabel: boolean = true
        ) => {
            const { circuit, id } = circ;
            if (circuit.gates.length === 0) return;
            
            const getBounds = (gates: (Gate | Circuit)[], dOffset: number, qOffset: number) => {
                let minDepth = Infinity, maxDepth = -Infinity, minQubit = Infinity, maxQubit = -Infinity;
                gates.forEach(g => {
                    const depth = g.depth + dOffset;
                    if ('gate' in g) {
                        const qubits = getInvolvedQubits(g).map(q => q + qOffset);
                        minDepth = Math.min(minDepth, depth);
                        maxDepth = Math.max(maxDepth, depth);
                        minQubit = Math.min(minQubit, ...qubits);
                        maxQubit = Math.max(maxQubit, ...qubits);
                    } else {
                        const nextBound = getBounds(g.circuit.gates, depth, g.startQubit + qOffset);
                        minDepth = Math.min(minDepth, nextBound.minDepth);
                        maxDepth = Math.max(maxDepth, nextBound.maxDepth);
                        minQubit = Math.min(minQubit, nextBound.minQubit);
                        maxQubit = Math.max(maxQubit, nextBound.maxQubit);
                    }
                });
                return { minDepth, maxDepth, minQubit, maxQubit };
            };

            const { minDepth, maxDepth, minQubit, maxQubit } = getBounds(circuit.gates, 0, 0);

            const baseY = (qubitOffset + minQubit) * qubitSpacing + qubitSpacing / 2 - gateSize / 2 - borderPadding;
            const rectX = (depthOffset + minDepth) * gateSpacing + gateSpacing / 2 - gateSize / 2 - borderPadding;
            const rectY = baseY;
            const rectWidth = (maxDepth - minDepth) * gateSpacing + gateSize + borderPadding * 2;
            const rectHeight = (maxQubit - minQubit) * qubitSpacing + gateSize + borderPadding * 2;

            const group = svg.append('g')
                .datum(circ)
                .attr('class', 'circuit-element')
                .attr('data-gate-id', id)
                .attr('opacity', isPreview ? previewOpacity : 1);

            // Border rectangle
            group.append('rect')
                .attr('x', rectX)
                .attr('y', rectY)
                .attr('width', rectWidth)
                .attr('height', rectHeight)
                .attr('fill', 'none')
                .attr('stroke', isSelected ? SELECTION_STYLES.strokeColor : circuit.color)
                .attr('stroke-width', isSelected ? SELECTION_STYLES.strokeWidth : 1)
                .attr('pointer-events', isTopCircuit && !isPreview ? 'all' : 'none')
                .attr('cursor', isTopCircuit ? 'grab' : 'default');

            if (isTopCircuit && !isPreview) {
                group.on('mousedown', (e: MouseEvent) => {
                    e.preventDefault();
                    handleMouseDown(circ, e);
                });
            }

            return showLabel ? { rectX, rectY, rectWidth, rectHeight, circuit, isTopCircuit } : null;
        };

        const renderCircuitLabel = (
            rectX: number,
            rectY: number,
            rectWidth: number,
            circuit: Circuit['circuit'],
            isTopCircuit: boolean
        ) => {
            const maxChars = Math.floor((rectWidth * (isTopCircuit ? 0.75 : 1) - labelPadding) / labelCharWidth);
            const labelText = circuit.symbol.length > maxChars ? circuit.symbol.substring(0, maxChars - 3) + '...' : circuit.symbol;
            const labelWidth = isTopCircuit ? Math.max(labelText.length * labelCharWidth + labelPadding, gateSpacing) : rectWidth;
            const labelX = isTopCircuit ? rectX + rectWidth - labelWidth - labelOffsetX : rectX;
            const labelY = isTopCircuit ? rectY - labelHeight : rectY;
            const textX = labelX + labelWidth / 2;

            const labelGroup = svg.append('g').attr('class', 'circuit-label');
            
            labelGroup.append('rect')
                .attr('x', labelX)
                .attr('y', labelY)
                .attr('width', labelWidth)
                .attr('height', labelHeight)
                .attr('fill', circuit.color)
                .attr('opacity', 0.75)
                .attr('pointer-events', 'none');

            labelGroup.append('text')
                .attr('x', textX)
                .attr('y', labelY + labelHeight / 2)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-family', fontFamily)
                .attr('class', 'text-xs fill-background')
                .attr('pointer-events', 'none')
                .text(labelText);
        };

        const renderCircuitBackground = (
            rectX: number,
            rectY: number,
            rectWidth: number,
            rectHeight: number,
            color: string
        ) => {
            svg.insert('rect', '.gate-element')
                .attr('class', 'circuit-background-clear fill-background')
                .attr('x', rectX)
                .attr('y', rectY)
                .attr('width', rectWidth)
                .attr('height', rectHeight)
                .attr('pointer-events', 'none');
        
            // Then draw the colored rectangle
            svg.insert('rect', '.gate-element')
                .attr('class', 'circuit-background-fill')
                .attr('x', rectX)
                .attr('y', rectY)
                .attr('width', rectWidth)
                .attr('height', rectHeight)
                .attr('fill', color)
                .attr('opacity', 0.25)
                .attr('pointer-events', 'none');
        };

        // Draw background
        svg.select('.circuit-background').remove();
        const background = svg.insert('g', ':first-child')
            .attr('class', 'circuit-background');

        const contentWidth = maxDepth * gateSpacing;
        const svgWidth = Math.max(scrollContainerWidth || contentWidth, contentWidth);
        const svgHeight = numQubits * qubitSpacing + footerHeight;

        svg.attr('width', svgWidth).attr('height', svgHeight);

        // Qubit lines
        for (let i = 0; i < numQubits; i++) {
            background.append('line')
                .attr('x1', 0).attr('y1', i * qubitSpacing + qubitSpacing / 2)
                .attr('x2', svgWidth).attr('y2', i * qubitSpacing + qubitSpacing / 2)
                .attr('class', 'stroke-border circuit-line')
                .attr('stroke-width', 2);
        }

        // Depth markers
        const markersY = numQubits * qubitSpacing + footerHeight / 2;
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
        svg.selectAll('.circuit-label').remove();
        svg.selectAll('.circuit-background-fill').remove();
        svg.selectAll('.circuit-background-clear').remove();

        const circuitLabelsToRender: Array<{
            rectX: number;
            rectY: number;
            rectWidth: number;
            rectHeight: number;
            circuit: Circuit['circuit'];
            isTopCircuit: boolean;
        }> = [];

        const renderGateRecursive = (g: Gate | Circuit, dOffset: number, qOffset: number, isPreview: boolean, depth: number = 0) => {
            if ('gate' in g) {
                renderGate({
                    ...g,
                    depth: dOffset + g.depth,
                    targetQubits: g.targetQubits.map(q => q + qOffset),
                    controlQubits: g.controlQubits.map(q => q + qOffset),
                }, isPreview, false, false);
            } else {
                g.circuit.gates.forEach(nested => 
                    renderGateRecursive(nested, dOffset + g.depth, qOffset + g.startQubit, isPreview, depth + 1)
                );
                if (showNestedCircuitBorders || depth === 0) { 
                    const circuitLabel = renderCircuitBorder(g, dOffset + g.depth, qOffset + g.startQubit, isPreview, false, false, depth === 0);
                    if (circuitLabel) {
                        circuitLabelsToRender.push(circuitLabel);
                    }

                }
            }
        };

        placedGates.forEach(gate => {
            const isPreview = draggableGateId === gate.id;
            const isSelected = selectedGateIds.has(gate.id);
            if ('circuit' in gate) {
                const { circuit, depth, startQubit } = gate;
                if (circuit.gates.length === 0) return;
                circuit.gates.forEach(g => renderGateRecursive(g, depth, startQubit, isPreview));
                const circuitLabel = renderCircuitBorder(gate, depth, startQubit, isPreview, isSelected, true, true);
                if (circuitLabel) {
                    circuitLabelsToRender.push(circuitLabel);
                }
            } else {
                renderGate(gate, isPreview, isSelected, true);
            }
        });

        [...circuitLabelsToRender].reverse().forEach(info => {
            renderCircuitBackground(info.rectX, info.rectY, info.rectWidth, info.rectHeight, info.circuit.color);
        });

        circuitLabelsToRender.forEach(info => {
            renderCircuitLabel(info.rectX, info.rectY, info.rectWidth, info.circuit, info.isTopCircuit);
        });
    }, [
        svgRef, numQubits, maxDepth, placedGates, draggableGateId, scrollContainerWidth,
        gateSize, fontFamily, fontWeight, fontStyle, gateSpacing, qubitSpacing, backgroundOpacity, previewOpacity, footerHeight,
        handleMouseDown, selectedGateIds
    ]);
}