import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';
import { GATE_CONFIG } from '@/features/gates/constants';
import {getBounds, getQubitSpan} from '@/features/gates/utils';
import { CIRCUIT_CONFIG } from "@/features/circuit/constants";

interface SelectionRect {
    startX: number;
    startY: number;
    width: number;
    height: number;
}

interface UseGateSelectionProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    placedGates: (Gate | Circuit)[];
    isEnabled?: boolean;
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
    preventClearSelection?: boolean;
}

export const SELECTION_STYLES = {
    // selected gate border styles
    strokeColor: '#eab308',
    strokeWidth: 2.5,
    // selection rectangle styles
    rectFillLight: 'rgba(59, 130, 246, 0.1)',
    rectStrokeLight: 'rgba(59, 130, 246, 0.5)',
    rectFillDark: 'rgba(255, 255, 255, 0.1)',
    rectStrokeDark: 'rgba(255, 255, 255, 0.5)',
    rectStrokeWidth: 1,
} as const;

export const HIGHLIGHT_STYLES = {
    strokeColor: '#14b8a6',
    strokeWidth: 2.5,
} as const;

export function useGateSelection({
    svgRef,
    placedGates,
    isEnabled = true,
    scrollContainerRef,
    preventClearSelection = false,
}: UseGateSelectionProps) {
    const { headerHeight } = CIRCUIT_CONFIG;
    const { gateSize, gateSpacing } = GATE_CONFIG;

    const [selectedGateIds, setSelectedGateIds] = useState<Set<string>>(new Set());
    const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const svgSelectionRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
    const selectionStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const selectionPosRef = useRef({ x: 0, y: 0 });

    // Memoize selectedGateIds to prevent unnecessary re-renders
    const selectedGateIdsKey = useMemo(
        () => Array.from(selectedGateIds).sort().join(','),
        [selectedGateIds]
    );

    const isGateInSelectionRect = useCallback((item: Gate | Circuit, rect: SelectionRect) => {
        const [rectLeft, rectRight, rectTop, rectBottom] = [
            Math.min(rect.startX, rect.startX + rect.width),
            Math.max(rect.startX, rect.startX + rect.width),
            Math.min(rect.startY, rect.startY + rect.height),
            Math.max(rect.startY, rect.startY + rect.height)
        ];
        let itemLeft, itemRight, itemTop, itemBottom;
        if ('circuit' in item) {
            // for circuits
            const { minDepth, maxDepth, minQubit, maxQubit } = getBounds(item.circuit.gates, 0, 0);
            itemLeft = (item.depth + minDepth) * gateSpacing + gateSpacing / 2 - gateSize / 2;
            itemRight = (item.depth + maxDepth) * gateSpacing + gateSize;
            itemTop = (item.startQubit + minQubit) * gateSpacing + gateSpacing / 2 - gateSize / 2 + headerHeight;
            itemBottom = (item.startQubit + maxQubit) * gateSpacing + gateSize + headerHeight;
        } else {
            // for gates
            const { minQubit, maxQubit } = getQubitSpan(item);
            const gateX = item.depth * gateSpacing + gateSpacing / 2;
            const minY = minQubit * gateSpacing + gateSpacing / 2 + headerHeight;
            const maxY = maxQubit * gateSpacing + gateSpacing / 2 + headerHeight;
            itemLeft = gateX - gateSize / 2;
            itemRight = gateX + gateSize / 2;
            itemTop = minY - gateSize / 2;
            itemBottom = maxY + gateSize / 2;
        }
        // check if rectangles overlap
        return itemRight >= rectLeft && itemLeft <= rectRight && itemBottom >= rectTop && itemTop <= rectBottom;
    }, [headerHeight, gateSize, gateSpacing]);

    const clearSelection = useCallback(() => {
        setSelectedGateIds(new Set());
    }, []);

    const updateSelection = useCallback(() => {
        if (!selectionStartPosRef.current || !svgRef.current) return;

        const svgRect = svgRef.current.getBoundingClientRect();
        const { x, y } = selectionPosRef.current;

        const newRect = {
            startX: selectionStartPosRef.current.x,
            startY: selectionStartPosRef.current.y,
            width: (x - svgRect.left) - selectionStartPosRef.current.x,
            height: (y - svgRect.top) - selectionStartPosRef.current.y,
        };

        setSelectionRect(newRect);

        const selected = new Set<string>();
        placedGates.forEach(gate => {
            if (isGateInSelectionRect(gate, newRect)) {
                selected.add(gate.id);
            }
        });
        setSelectedGateIds(selected);
    }, [svgRef, placedGates, isGateInSelectionRect]);

    const handleMouseDown = useCallback((event: MouseEvent) => {
        if (!isEnabled || !svgRef.current || event.button !== 0) return;

        const target = event.target as HTMLElement;
        const isSelectingGate = target.closest('.gate-element, .circuit-element');
        const isInsideSvg = svgRef.current.contains(target);

        if (preventClearSelection) return;

        // Don't do anything if clicking outside SVG
        if (!isInsideSvg) return;

        // Clear selection only if clicking inside SVG on empty space
        if (!isSelectingGate && selectedGateIds.size > 0) {
            clearSelection();
        }

        // Start selection rectangle on empty space within SVG
        if (!isSelectingGate) {
            const rect = svgRef.current.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            selectionStartPosRef.current = { x, y };
            selectionPosRef.current = { x: event.clientX, y: event.clientY };
            setIsSelecting(true);
            setSelectionRect({ startX: x, startY: y, width: 0, height: 0 });
        }
    }, [isEnabled, svgRef, clearSelection, selectedGateIds.size, preventClearSelection]);

    const updateFrameRef = useRef<number | undefined>(undefined);
    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isSelecting) return;
        selectionPosRef.current = { x: event.clientX, y: event.clientY };

        if (updateFrameRef.current !== undefined) return;
        updateFrameRef.current = requestAnimationFrame(() => {
            updateSelection();
            updateFrameRef.current = undefined;
        });
    }, [isSelecting, updateSelection]);

    const handleMouseUp = useCallback(() => {
        setIsSelecting(false);
        setSelectionRect(null);
        selectionStartPosRef.current = null;
    }, []);

    // handle keyboard events
    useEffect(() => {
        if (!isEnabled) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearSelection();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEnabled, clearSelection]);

    // auto-scroll during selection
    useEffect(() => {
        if (!isSelecting || !scrollContainerRef?.current) return;

        let frameId: number;

        const autoScroll = () => {
            const viewport = scrollContainerRef.current;
            if (!viewport) {
                frameId = requestAnimationFrame(autoScroll);
                return;
            }

            const rect = viewport.getBoundingClientRect();
            const { x, y } = selectionPosRef.current;

            const edgeThreshold = 50;
            const scrollSpeed = 10;

            if (x < rect.left + edgeThreshold) {
                viewport.scrollLeft = Math.max(0, viewport.scrollLeft - scrollSpeed);
            } else if (x > rect.right - edgeThreshold) {
                viewport.scrollLeft += scrollSpeed;
            }

            if (y < rect.top + edgeThreshold) {
                viewport.scrollTop = Math.max(0, viewport.scrollTop - scrollSpeed);
            } else if (y > rect.bottom - edgeThreshold) {
                viewport.scrollTop += scrollSpeed;
            }

            frameId = requestAnimationFrame(autoScroll);
        };

        frameId = requestAnimationFrame(autoScroll);
        return () => cancelAnimationFrame(frameId);
    }, [isSelecting, scrollContainerRef]);

    // Mouse events
    useEffect(() => {
        if (!isEnabled) return;

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isEnabled, handleMouseDown, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        if (!svgRef.current) return;

        if (!svgSelectionRef.current || svgSelectionRef.current.node() !== svgRef.current) {
            svgSelectionRef.current = d3.select(svgRef.current);
        }

        let rect = svgSelectionRef.current.select<SVGRectElement>('.selection-rect');

        if (rect.empty()) {
            rect = svgSelectionRef.current.append('rect')
                .attr('class', 'selection-rect')
                .attr('pointer-events', 'none')
                .style('display', 'none');
        }

        if (selectionRect && isSelecting) {
            const { startX, startY, width, height } = selectionRect;
            const isDarkMode = document.documentElement.classList.contains('dark');
            
            rect.style('display', 'block')
                .attr('x', width >= 0 ? startX : startX + width)
                .attr('y', height >= 0 ? startY : startY + height)
                .attr('width', Math.abs(width))
                .attr('height', Math.abs(height))
                .attr('fill', isDarkMode ? SELECTION_STYLES.rectFillDark : SELECTION_STYLES.rectFillLight)
                .attr('stroke', isDarkMode ? SELECTION_STYLES.rectStrokeDark : SELECTION_STYLES.rectStrokeLight)
                .attr('stroke-width', SELECTION_STYLES.rectStrokeWidth);
        } else {
            rect.style('display', 'none');
        }
    }, [svgRef, selectionRect, isSelecting]);

    // Cleanup only on unmount
    useEffect(() => {
        return () => {
            svgSelectionRef.current?.select('.selection-rect').remove();
            svgSelectionRef.current = null;
        };
    }, []);

    return {
        selectedGateIds,
        selectedGateIdsKey,
        clearSelection,
        isSelecting,
    };
}