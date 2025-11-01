import React, { useEffect, useRef, useMemo, useCallback} from 'react';
import * as d3 from 'd3';

import { GATE_CONFIG } from '@/features/gates/constants';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import { SELECTION_STYLES } from '@/features/circuit/hooks/useGateSelection';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';
import {getBounds, getInvolvedQubits, getQubitSpan} from "@/features/gates/utils";

interface UseCircuitRendererProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    maxDepth: number;
    placedGates: (Gate | Circuit)[];
    draggableGateId?: string | null;
    selectedGateIdsKey?: string;
    scrollContainerWidth?: number | null;
    showNestedCircuit?: boolean;
    isExecuting?: boolean;
    handleMouseDown?: (gate: Gate | Circuit, event: MouseEvent) => void;
}

const gateMetadataCache = new WeakMap<Gate | Circuit, { bounds: ReturnType<typeof getQubitSpan>, involvedQubits: number[] }>();

function getGateMetadata(gate: Gate | Circuit) {
    let cached = gateMetadataCache.get(gate);
    if (!cached) {
        cached = {
            bounds: getQubitSpan(gate),
            involvedQubits: getInvolvedQubits(gate),
        };
        gateMetadataCache.set(gate, cached);
    }
    return cached;
}

export function useCircuitRenderer({
    svgRef,
    numQubits,
    maxDepth,
    placedGates,
    draggableGateId = '',
    selectedGateIdsKey = '',
    scrollContainerWidth,
    showNestedCircuit = false,
    isExecuting = false,
    handleMouseDown,
}: UseCircuitRendererProps) {
    const {footerHeight, headerHeight, defaultScrollPaddingDepth} = CIRCUIT_CONFIG;
    const {
        fontFamily,
        fontWeight,
        fontStyle,
        gateSize,
        gateSpacing,
        qubitSpacing,
        backgroundOpacity,
        previewOpacity
    } = GATE_CONFIG;

    const borderPadding = 4;
    const labelHeight = 16;
    const labelCharWidth = 6;
    const labelPadding = 8;
    const labelOffsetX = 0;

    const renderGate = useCallback((
        gate: Gate,
        isPreview: boolean,
        isSelected: boolean,
        hasHitbox: boolean,
        group: d3.Selection<SVGGElement, unknown, null, undefined>
    ) => {
        const metadata = getGateMetadata(gate);
        const {minQubit} = metadata.bounds;
        const x = gate.depth * gateSpacing + gateSpacing / 2;
        const y = minQubit * qubitSpacing + qubitSpacing / 2 + headerHeight;

        group
            .datum(gate)
            .attr('class', 'gate-element')
            .attr('data-gate-id', gate.id)
            .attr('opacity', isPreview ? previewOpacity : 1)
            .style('cursor', isPreview || isExecuting ? 'default' : 'grab');

        const totalQubits = gate.gate.numTargetQubits + gate.gate.numControlQubits;

        if (totalQubits === 1) {
            const {textSize, borderWidth, borderRadius} = GATE_CONFIG.singleQubit;
            const qubitY = gate.targetQubits[0] * qubitSpacing + qubitSpacing / 2 + headerHeight;

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
            const {textSize, lineWidth, targetRadius, controlDotRadius} = GATE_CONFIG.multiQubit;
            const involvedQubits = metadata.involvedQubits;
            const yFirst = involvedQubits[0] * qubitSpacing + qubitSpacing / 2 + headerHeight;
            const yLast = involvedQubits[involvedQubits.length - 1] * qubitSpacing + qubitSpacing / 2 + headerHeight;

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
                const yControl = controlQubit * qubitSpacing + qubitSpacing / 2 + headerHeight;
                drawCircle(yControl, controlDotRadius);
            });

            gate.targetQubits.forEach((targetQubit: number) => {
                const yTarget = targetQubit * qubitSpacing + qubitSpacing / 2 + headerHeight;
                drawCircle(yTarget, targetRadius);
            });

            const textY = gate.targetQubits[gate.targetQubits.length - 1] * qubitSpacing + qubitSpacing / 2 + headerHeight;
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
            const involvedQubits = metadata.involvedQubits;
            const hitboxYFirst = involvedQubits[0] * qubitSpacing + qubitSpacing / 2 + headerHeight;
            const hitboxYLast = involvedQubits[involvedQubits.length - 1] * qubitSpacing + qubitSpacing / 2 + headerHeight;
            const hitboxHeight = hitboxYLast - hitboxYFirst + gateSize;

            group.append('rect')
                .attr('x', x - gateSize / 2)
                .attr('y', hitboxYFirst - gateSize / 2)
                .attr('width', gateSize)
                .attr('height', hitboxHeight)
                .attr('fill', 'transparent')
                .attr('cursor', isExecuting ? 'default' : 'grab')
                .on('mousedown', (event) => {
                    event.preventDefault();
                    handleMouseDown?.(gate, event);
                });
        }
    }, [gateSpacing, qubitSpacing, headerHeight, gateSize, fontFamily, fontWeight, fontStyle, backgroundOpacity, previewOpacity, handleMouseDown]);

    const renderCircuitBorder = useCallback((
        circ: Circuit,
        dOffset: number,
        qOffset: number,
        isPreview: boolean,
        isSelected: boolean,
        isTopCircuit: boolean,
        group: d3.Selection<SVGGElement, unknown, null, undefined>,
        showLabel: boolean = true
    ) => {
        const {circuit, id} = circ;
        if (circuit.gates.length === 0) return null;

        const {minDepth, maxDepth, minQubit, maxQubit} = getBounds(circuit.gates, 0, 0);

        const baseY = (qOffset + minQubit) * qubitSpacing + qubitSpacing / 2 - gateSize / 2 - borderPadding + headerHeight;
        const rectX = (dOffset + minDepth) * gateSpacing + gateSpacing / 2 - gateSize / 2 - borderPadding;
        const rectY = baseY;
        const rectWidth = (maxDepth - minDepth) * gateSpacing + gateSize + borderPadding * 2;
        const rectHeight = (maxQubit - minQubit) * qubitSpacing + gateSize + borderPadding * 2;

        group
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
            .attr('cursor', isTopCircuit && !isExecuting ? 'grab' : 'default');

        if (isTopCircuit && !isPreview) {
            group.on('mousedown', (e: MouseEvent) => {
                e.preventDefault();
                handleMouseDown?.(circ, e);
            });
        }

        return {rectX, rectY, rectWidth, rectHeight, circuit, isTopCircuit, showLabel};
    }, [qubitSpacing, gateSize, borderPadding, headerHeight, gateSpacing, previewOpacity, handleMouseDown]);

    const renderCircuitLabel = useCallback((
        rectX: number,
        rectY: number,
        rectWidth: number,
        circuit: Circuit['circuit'],
        isTopCircuit: boolean,
        labelContainer: d3.Selection<SVGGElement, unknown, null, undefined>
    ) => {
        const maxChars = Math.floor((rectWidth * (isTopCircuit ? 0.75 : 1) - labelPadding) / labelCharWidth);
        const labelText = circuit.symbol.length > maxChars ? circuit.symbol.substring(0, maxChars - 3) + '...' : circuit.symbol;
        const labelWidth = isTopCircuit ? Math.max(labelText.length * labelCharWidth + labelPadding, gateSpacing) : rectWidth;
        const labelX = isTopCircuit ? rectX + rectWidth - labelWidth - labelOffsetX : rectX;
        const labelY = isTopCircuit ? rectY - labelHeight : rectY;
        const textX = labelX + labelWidth / 2;

        const labelGroup = labelContainer.append('g').attr('class', 'circuit-label');

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
    }, [labelPadding, labelCharWidth, gateSpacing, labelOffsetX, labelHeight, fontFamily]);

    const renderCircuitBackground = useCallback((
        rectX: number,
        rectY: number,
        rectWidth: number,
        rectHeight: number,
        color: string,
        bgContainer: d3.Selection<SVGGElement, unknown, null, undefined>
    ) => {
        bgContainer.append('rect')
            .attr('class', 'circuit-background-clear fill-background')
            .attr('x', rectX)
            .attr('y', rectY)
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr('pointer-events', 'none');

        // Then draw the colored rectangle
        bgContainer.append('rect')
            .attr('class', 'circuit-background-fill')
            .attr('x', rectX)
            .attr('y', rectY)
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr('fill', color)
            .attr('opacity', 0.25)
            .attr('pointer-events', 'none');
    }, []);

    // Cache D3 selections to avoid repeated queries
    const d3CacheRef = useRef<{
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
        background: d3.Selection<SVGGElement, unknown, null, undefined> | null;
        circuitBgContainer: d3.Selection<SVGGElement, unknown, null, undefined> | null;
        gateContainer: d3.Selection<SVGGElement, unknown, null, undefined> | null;
        circuitContainer: d3.Selection<SVGGElement, unknown, null, undefined> | null;
        labelContainer: d3.Selection<SVGGElement, unknown, null, undefined> | null;
    }>({
        svg: null,
        background: null,
        circuitBgContainer: null,
        gateContainer: null,
        circuitContainer: null,
        labelContainer: null
    });

    const dimensions = useMemo(() => {
        const scrollableDepth = maxDepth + defaultScrollPaddingDepth;
        const contentWidth = scrollableDepth * gateSpacing;
        const svgWidth = Math.max(scrollContainerWidth || contentWidth, contentWidth);
        const svgHeight = numQubits * qubitSpacing + footerHeight + headerHeight;
        return {scrollableDepth, contentWidth, svgWidth, svgHeight};
    }, [
        numQubits,
        maxDepth, 
        scrollContainerWidth, 
        defaultScrollPaddingDepth, 
        gateSpacing,
        qubitSpacing, 
        footerHeight, 
        headerHeight
    ]);

    const selectedGateIds = useMemo(
        () => new Set(selectedGateIdsKey ? selectedGateIdsKey.split(',') : []),
        [selectedGateIdsKey]
    );

    useEffect(() => {
        if (!svgRef.current) return;

        if (!d3CacheRef.current.svg || d3CacheRef.current.svg.node() !== svgRef.current) {            
            const svg = d3.select(svgRef.current);

            // Clean up old containers
            svg.selectAll('.circuit-background, .circuit-backgrounds-group, .gates-group, .circuits-group, .labels-group').remove();

            // Create all containers once
            d3CacheRef.current.svg = svg;
            d3CacheRef.current.background = svg.insert('g', ':first-child').attr('class', 'circuit-background');
            d3CacheRef.current.circuitBgContainer = svg.append('g').attr('class', 'circuit-backgrounds-group');
            d3CacheRef.current.gateContainer = svg.append('g').attr('class', 'gates-group');
            d3CacheRef.current.circuitContainer = svg.append('g').attr('class', 'circuits-group');
            d3CacheRef.current.labelContainer = svg.append('g').attr('class', 'labels-group');
        }

        const svg = d3CacheRef.current.svg!;
        const background = d3CacheRef.current.background!;
        const circuitBgContainer = d3CacheRef.current.circuitBgContainer!;
        const gateContainer = d3CacheRef.current.gateContainer!;
        const circuitContainer = d3CacheRef.current.circuitContainer!;
        const labelContainer = d3CacheRef.current.labelContainer!;

        // Set SVG dimensions
        svg.attr('width', dimensions.svgWidth).attr('height', dimensions.svgHeight);

        // Clear and redraw background
        background.selectAll('*').remove();

        // Qubit lines
        for (let i = 0; i < numQubits; i++) {
            background.append('line')
                .attr('x1', 0).attr('y1', i * qubitSpacing + qubitSpacing / 2 + headerHeight)
                .attr('x2', dimensions.svgWidth).attr('y2', i * qubitSpacing + qubitSpacing / 2 + headerHeight)
                .attr('class', 'stroke-border circuit-line')
                .attr('stroke-width', 2);
        }

        // Depth markers
        const markersY = numQubits * qubitSpacing + footerHeight / 2 + headerHeight;
        for (let i = 1; i <= maxDepth; i++) {
            background.append('text')
                .attr('x', (i - 1) * gateSpacing + gateSpacing / 2)
                .attr('y', markersY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('class', 'fill-muted-foreground text-xs font-mono depth-marker')
                .text(i);
        }

        circuitBgContainer.selectAll('*').remove();
        gateContainer.selectAll('*').remove();
        circuitContainer.selectAll('*').remove();
        labelContainer.selectAll('*').remove();

        // Collect circuit borders to render
        const circuitBorders: Array<{
            rectX: number;
            rectY: number;
            rectWidth: number;
            rectHeight: number;
            circuit: Circuit['circuit'];
            isTopCircuit: boolean;
            showLabel: boolean;
        }> = [];

        // Recursive gate rendering function
        const renderGateRecursive = (
            g: Gate | Circuit,
            dOffset: number,
            qOffset: number,
            isPreview: boolean,
            depth: number = 0
        ) => {
            if ('gate' in g) {
                const group = gateContainer.append('g');
                renderGate({
                    ...g,
                    depth: dOffset + g.depth,
                    targetQubits: g.targetQubits.map(q => q + qOffset),
                    controlQubits: g.controlQubits.map(q => q + qOffset),
                }, isPreview, false, false, group);
            } else {
                g.circuit.gates.forEach(nested =>
                    renderGateRecursive(nested, dOffset + g.depth, qOffset + g.startQubit, isPreview, depth + 1)
                );
                if (showNestedCircuit || depth === 0) {
                    const group = circuitContainer.append('g');
                    const border = renderCircuitBorder(g, dOffset + g.depth, qOffset + g.startQubit, isPreview, false, false, group, depth === 0);
                    if (border) {
                        circuitBorders.push(border);
                    }
                }
            }
        };

        // Render all placed gates
        placedGates.forEach(gate => {
            const isPreview = draggableGateId === gate.id;
            const isSelected = selectedGateIds.has(gate.id);
            if ('circuit' in gate) {
                const {circuit, depth, startQubit} = gate;
                if (circuit.gates.length === 0) return;
                circuit.gates.forEach(g => renderGateRecursive(g, depth, startQubit, isPreview));
                const group = circuitContainer.append('g');
                const border = renderCircuitBorder(gate, depth, startQubit, isPreview, isSelected, true, group, true);
                if (border) {
                    circuitBorders.push(border);
                }
            } else {
                const group = gateContainer.append('g');
                renderGate(gate, isPreview, isSelected, true, group);
            }
        });

        // Render circuit backgrounds (reverse order for proper layering)
        [...circuitBorders].reverse().forEach(info => {
            renderCircuitBackground(info.rectX, info.rectY, info.rectWidth, info.rectHeight, info.circuit.color, circuitBgContainer);
        });

        // Render circuit labels
        circuitBorders.forEach(info => {
            if (info.showLabel) {
                renderCircuitLabel(info.rectX, info.rectY, info.rectWidth, info.circuit, info.isTopCircuit, labelContainer);
            }
        });
    }, [
        svgRef,
        dimensions.svgHeight,
        dimensions.svgWidth,
        numQubits,
        maxDepth,
        placedGates,
        draggableGateId,
        showNestedCircuit,
        selectedGateIds,
        gateSpacing,
        qubitSpacing,
        footerHeight,
        headerHeight,
        renderGate,
        renderCircuitBorder,
        renderCircuitBackground,
        renderCircuitLabel,
    ])
}