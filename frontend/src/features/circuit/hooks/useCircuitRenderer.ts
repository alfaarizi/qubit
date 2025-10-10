import React, { useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import type { CircuitGate } from '@/features/gates/types';
import { GATE_CONFIG } from '@/features/gates/constants';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import {getInvolvedQubits, getQubitSpan} from "@/features/gates/utils";

interface UseCircuitRendererProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    maxDepth: number;
    gatesToRender?: CircuitGate[];
    previewGate?: CircuitGate | null;
    scrollContainerWidth?: number;
    onUpdateGatePosition?: (gateId: string, targetDepth: number, qubit: number) => void;
    onRemoveGate?: (gateId: string) => void;
    onShowPreview?: (gate: CircuitGate, depth: number, qubit: number) => void;
    onHidePreview?: () => void;
    onStartDragging?: (gateId: string, offset: { x: number; y: number }) => void;
    onEndDragging?: () => void;
}

export function useCircuitRenderer({
    svgRef,
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

    // const hasCollision = useCallback((
    //     depth: number,
    //     startQubit: number,
    //     endQubit: number,
    //     excludeId?: string
    // ) => {
    //     return placedGates.some(pg => {
    //         if (pg.id === excludeId) return false;
    //         if (pg.depth !== depth) return false;
    //         const { startQubit: existingStart, endQubit: existingEnd } = getQubitSpan(pg);
    //         return !(endQubit < existingStart || existingEnd < startQubit);
    //     });
    // }, [placedGates]);

    // const findNextAvailableDepth = useCallback((
    //     startQubit: number,
    //     endQubit: number,
    //     excludeId?: string
    // ) => {
    //     let depth = 0;
    //     while (hasCollision(depth, startQubit, endQubit, excludeId)) {
    //         depth++;
    //     }
    //     return depth;
    // }, [hasCollision]);

    const recalculateDepth = useCallback((
        circuitGate: CircuitGate,
    ): void => {
        circuitGate.depth = Math.max(-1, ...circuitGate.parents.map(pg => pg.depth)) + 1;
        circuitGate.shape?.attr('x', circuitGate.depth * gateSpacing + gateSpacing / 2);
        circuitGate.children.forEach(cg => {
            recalculateDepth(cg);
        });
    }, [gateSpacing]);

    const injectGate = useCallback((
        circuitGate: CircuitGate,
        circuitGateArr: CircuitGate[],
    ): void => {
        const qubitToChildren: Record<number, CircuitGate> = {};
        const qubitToParent: Record<number, CircuitGate> = {};
        circuitGateArr.forEach((gate) => {
            const allQubits = getInvolvedQubits(gate).filter(x =>
                getInvolvedQubits(circuitGate).includes(x)
            );
            if (gate.depth < circuitGate.depth) {
                allQubits.forEach((qubit) => {
                    if (!(qubit in qubitToParent) || gate.depth > qubitToParent[qubit].depth) {
                        qubitToParent[qubit] = gate;
                    }
                });
            } else {
                allQubits.forEach((qubit) => {
                    if (!(qubit in qubitToChildren) || gate.depth < qubitToChildren[qubit].depth) {
                        qubitToChildren[qubit] = gate;
                    }
                });
            }
        });

        Object.keys(qubitToParent)
            .filter(k => k in qubitToChildren)
            .forEach(key => {
                const numKey = Number(key);
                const child = qubitToChildren[numKey];
                const parent = qubitToParent[numKey];
                child.parents.splice(child.parents.indexOf(parent), 1);
                parent.children.splice(parent.children.indexOf(child), 1);
            });

        Object.keys(qubitToParent).forEach(k => {
            const numKey = Number(k);
            const parent = qubitToParent[numKey];
            parent.children.push(circuitGate);
            circuitGate.parents.push(parent);
        });

        Object.keys(qubitToChildren).forEach(k => {
            const numKey = Number(k);
            const child = qubitToChildren[numKey];
            child.parents.push(circuitGate);
            circuitGate.children.push(child);
        });

        recalculateDepth(circuitGate);

    }, [recalculateDepth]);

    const removeGate = useCallback((
        circuitGate: CircuitGate,
    ): void => {
        const qubits: Record<number, CircuitGate> = {};
        circuitGate.parents.forEach(pg => {
            pg.children.splice(pg.children.indexOf(circuitGate), 1);

            const allQubits = getInvolvedQubits(pg).filter(x =>
                getInvolvedQubits(circuitGate).includes(x)
            );
            allQubits.forEach(qubit => {
                qubits[qubit] = pg;
            });
        });
        circuitGate.children.forEach(cg => {
            cg.parents.splice(cg.parents.indexOf(circuitGate), 1);

            const allQubits = getInvolvedQubits(cg).filter(x =>
                getInvolvedQubits(circuitGate).includes(x)
            );
            allQubits.forEach(qubit => {
                if (qubit in qubits) {
                    cg.parents.push(qubits[qubit]);
                    qubits[qubit].children.push(cg);
                }
            });
            recalculateDepth(cg);
        });
        circuitGate.parents = [];
        circuitGate.children = [];

    }, [recalculateDepth]);

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

        gatesToRender.forEach(circuitGate => {
            const { id, gate, depth, targetQubits, controlQubits } = circuitGate;
            const { startQubit, endQubit } = getQubitSpan(circuitGate);
            const isPreview = id === previewGate?.id;

            const x = depth * gateSpacing + gateSpacing / 2;
            const y = startQubit * gateSpacing + gateSpacing / 2;

            const group = svg.append('g')
                .attr('class', 'gate-element')
                .attr('data-gate-id', id)
                .attr('opacity', isPreview ? previewOpacity : 1)
                .style('cursor', isPreview ? 'default' : 'grab');

            // if (!isPreview) { // Temporary for debugging purposes, this shows the target and control qubits of the gate
            //     const labelText = controlQubits.length > 0
            //         ? `C:[${controlQubits}] T:[${targetQubits}]`
            //         : `Q:${targetQubits[0]}`;
            //     const labelY = endQubit * gateSpacing + gateSpacing + gateSpacing / 4;
            //     group.append('text')
            //         .attr('x', x)
            //         .attr('y', labelY)
            //         .attr('text-anchor', 'middle')
            //         .attr('class', 'text-xs fill-foreground font-mono')
            //         .attr('pointer-events', 'none')
            //         .style('font-size', '10px')
            //         .text(labelText);
            // }

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
                    onShowPreview(circuitGate, depth, startQubit);

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                        const totalQubits = gate.numControlQubits + gate.numTargetQubits;
                        const pos = getGridPosition(moveEvent, totalQubits);
                        if (!pos) return;
                        onUpdateGatePosition(id, pos.depth, pos.qubit);
                    };

                    const handleMouseUp = (upEvent: MouseEvent) => {
                        const totalQubits = gate.numControlQubits + gate.numTargetQubits;
                        const pos = getGridPosition(upEvent, totalQubits);
                        if (!pos) return;
                        if (pos.y < 0 || pos.y > numQubits * gateSpacing) {
                            onRemoveGate(id);
                        } else {
                            onUpdateGatePosition(id, pos.depth, pos.qubit);
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
    }, [svgRef, numQubits, maxDepth, gatesToRender, previewGate, scrollContainerWidth, getGridPosition,
        gateSize, fontFamily, fontWeight, fontStyle, gateSpacing, backgroundOpacity, previewOpacity, footerHeight,
        onStartDragging, onUpdateGatePosition, onRemoveGate, onShowPreview, onHidePreview, onEndDragging]);

    return {
        getGridPosition,
        onUpdateGatePosition,
        onRemoveGate,
        removeGate,
        injectGate
    };
}