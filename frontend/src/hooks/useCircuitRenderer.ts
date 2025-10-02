import React, { useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { GATE_STYLES } from '@/lib/styles';
import type { DraggableGate } from '@/types/circuit';

interface UseCircuitRendererProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    gates: DraggableGate[];
    placedGates: DraggableGate[];
    numQubits: number;
    maxDepth: number;
    onUpdateGatePosition: (gateId: string, depth: number, qubit: number) => void;
    onRemoveGate: (gateId: string) => void;
    onShowPreview: (gate: DraggableGate['gate'], depth: number, qubit: number) => void;
    onHidePreview: () => void;
    onStartDragging: (gateId: string) => void;
    onEndDragging: () => void;
}

export function useCircuitRenderer({
    svgRef,
    gates,
    placedGates,
    numQubits,
    maxDepth,
    onStartDragging,
    onUpdateGatePosition,
    onRemoveGate,
    onShowPreview,
    onHidePreview,
    onEndDragging
}: UseCircuitRendererProps) {
    const GATE_SPACING = GATE_STYLES.gateSpacing;

    // ========== Logic Functions ==========

    const getGridPosition = useCallback((e: { clientX: number; clientY: number }) => {
        if (!svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return {
            depth: Math.floor(x / GATE_SPACING),
            qubit: Math.floor(y / GATE_SPACING),
            y
        };
    }, [svgRef, GATE_SPACING]);

    const hasCollision = useCallback((
        depth: number,
        qubit: number,
        qubits: number,
        excludeId?: string
    ) => {
        return placedGates.some(pg => {
            if (pg.id === excludeId) return false;
            if (pg.depth !== depth) return false;
            const end1 = qubit + qubits - 1;
            const end2 = pg.qubit + pg.gate.qubits - 1;
            return !(end1 < pg.qubit || end2 < qubit);
        });
    }, [placedGates]);

    const isValid = useCallback((
        depth: number,
        qubit: number,
        qubits: number,
        excludeId?: string
    ) => {
        if (depth < 0 || depth >= maxDepth) return false;
        if (qubit < 0 || qubit + qubits > numQubits) return false;
        return !hasCollision(depth, qubit, qubits, excludeId);
    }, [numQubits, maxDepth, hasCollision]);

    // ========== Rendering Effect ==========

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('.gate-element').remove();

        gates.forEach(draggableGate => {
            const { gate, depth, qubit, isPreview, id } = draggableGate;
            const x = depth * GATE_SPACING + GATE_SPACING / 2;
            const y = qubit * GATE_SPACING + GATE_SPACING / 2;

            const group = svg.append('g')
                .attr('class', 'gate-element')
                .attr('data-gate-id', id)
                .attr('opacity', isPreview ? GATE_STYLES.previewOpacity : 1)
                .style('cursor', isPreview ? 'default' : 'grab');

            if (gate.qubits === 1) {
                const { size, borderWidth, borderRadius } = GATE_STYLES.singleQubit;

                group.append('rect')
                    .attr('x', x - size / 2)
                    .attr('y', y - size / 2)
                    .attr('width', size)
                    .attr('height', size)
                    .attr('fill', 'white')
                    .attr('class', 'fill-background')
                    .attr('rx', borderRadius)
                    .attr('pointer-events', isPreview ? 'none' : 'auto');

                group.append('rect')
                    .attr('x', x - size / 2)
                    .attr('y', y - size / 2)
                    .attr('width', size)
                    .attr('height', size)
                    .attr('fill', `${gate.color}${GATE_STYLES.backgroundOpacity}`)
                    .attr('stroke', gate.color)
                    .attr('stroke-width', borderWidth)
                    .attr('rx', borderRadius)
                    .attr('pointer-events', isPreview ? 'none' : 'auto');

                group.append('text')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('class', `${GATE_STYLES.singleQubit.fontWeight} ${GATE_STYLES.singleQubit.textSize} fill-foreground`)
                    .attr('font-family', GATE_STYLES.singleQubit.fontFamily)
                    .attr('pointer-events', 'none')
                    .text(gate.symbol);

            } else if (gate.qubits > 1) {
                const { lineWidth, controlDotRadius, targetRadius } = GATE_STYLES.multiQubit;
                const targetQubit = qubit + gate.qubits - 1;
                const yLast = targetQubit * GATE_SPACING + GATE_SPACING / 2;

                const drawCircle = (cy: number, radius: number) => {
                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('class', 'fill-background');

                    group.append('circle')
                        .attr('cx', x).attr('cy', cy)
                        .attr('r', radius)
                        .attr('fill', `${gate.color}${GATE_STYLES.backgroundOpacity}`)
                        .attr('stroke', gate.color)
                        .attr('stroke-width', lineWidth);
                };

                // Draw line spanning all qubits
                group.append('line')
                    .attr('x1', x).attr('y1', y)
                    .attr('x2', x).attr('y2', yLast)
                    .attr('stroke', gate.color)
                    .attr('stroke-width', lineWidth);

                // Draw control dots
                for (let i = 0; i < gate.qubits - 1; i++) {
                    const yControl = (qubit + i) * GATE_SPACING + GATE_SPACING / 2;
                    drawCircle(yControl, controlDotRadius);
                }

                // Draw target on last qubit
                drawCircle(yLast, targetRadius);

                group.append('text')
                    .attr('x', x)
                    .attr('y', yLast)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('class', `${GATE_STYLES.multiQubit.fontWeight} ${GATE_STYLES.multiQubit.textSize} fill-foreground`)
                    .attr('font-family', GATE_STYLES.multiQubit.fontFamily)
                    .attr('pointer-events', 'none')
                    .text(gate.symbol);
            }

            // Add interaction for placed gates
            if (!isPreview) {
                group.on('mousedown', function(event) {
                    event.preventDefault();
                    onStartDragging(id);

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                        const pos = getGridPosition(moveEvent);
                        if (!pos) return;
                        if (isValid(pos.depth, pos.qubit, gate.qubits, id)) {
                            onShowPreview(gate, pos.depth, pos.qubit);
                        } else {
                            onHidePreview();
                        }
                    };

                    const handleMouseUp = (upEvent: MouseEvent) => {
                        const pos = getGridPosition(upEvent);
                        if (pos) {
                            const circuitHeight = numQubits * GATE_SPACING;
                            if (pos.y < 0 || pos.y > circuitHeight) {
                                onRemoveGate(id);
                            } else if (isValid(pos.depth, pos.qubit, gate.qubits, id)) {
                                onUpdateGatePosition(id, pos.depth, pos.qubit);
                            }
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
    }, [gates, svgRef, GATE_SPACING, numQubits, getGridPosition, isValid,
        onStartDragging, onUpdateGatePosition, onRemoveGate, onShowPreview, onHidePreview, onEndDragging]);

    return {
        getGridPosition,
        isValid
    };
}