import React, { useState, useCallback, useRef, useEffect } from 'react';
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

const SCROLL_EDGE_THRESHOLD = 50;
const SCROLL_SPEED = 10;

export const SELECTION_STYLES = {
    // selected gate border styles
    strokeColor: '#eab308',
    strokeWidth: 2.0,
    // selection rectangle styles
    rectFillLight: 'rgba(59, 130, 246, 0.1)',
    rectStrokeLight: 'rgba(59, 130, 246, 0.5)',
    rectFillDark: 'rgba(255, 255, 255, 0.1)',
    rectStrokeDark: 'rgba(255, 255, 255, 0.5)',
    rectStrokeWidth: 1,
} as const;

export function useGateSelection({
    svgRef,
    placedGates,
    isEnabled = true,
    scrollContainerRef,
    preventClearSelection = false,
}: UseGateSelectionProps) {
    const { headerHeight } = CIRCUIT_CONFIG;

    const [selectedGateIds, setSelectedGateIds] = useState<Set<string>>(new Set());
    const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const selectionRectRef = useRef<d3.Selection<SVGRectElement, unknown, null, undefined> | null>(null);
    const selectionStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const selectionPosRef = useRef({ x: 0, y: 0 });

    const isGateInSelectionRect = useCallback((item: Gate | Circuit, rect: SelectionRect) => {
        const { gateSize, gateSpacing } = GATE_CONFIG;
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
    }, [headerHeight]);

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
        const isSelectingGate = target.closest('.gate-element');
        const isInsideSvg = svgRef.current.contains(target);

        if (preventClearSelection) return;

        // clear selection if clicking outside SVG or on empty space
        if (!isInsideSvg || (!isSelectingGate && selectedGateIds.size > 0)) {
            clearSelection();
        }

        // Start selection rectangle on empty space within SVG
        if (isInsideSvg && !isSelectingGate) {
            const rect = svgRef.current.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            selectionStartPosRef.current = { x, y };
            selectionPosRef.current = { x: event.clientX, y: event.clientY };
            setIsSelecting(true);
            setSelectionRect({ startX: x, startY: y, width: 0, height: 0 });
        }
    }, [isEnabled, svgRef, clearSelection, selectedGateIds.size, preventClearSelection]);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isSelecting) return;
        selectionPosRef.current = { x: event.clientX, y: event.clientY };
        updateSelection();
    }, [isSelecting, updateSelection]);

    const handleMouseUp = useCallback(() => {
        setIsSelecting(false);
        setSelectionRect(null);
        selectionStartPosRef.current = null;
    }, []);

    // handle keyboard events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearSelection();
            }
        };
        if (isEnabled) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isEnabled, clearSelection]);

    // auto-scroll during selection
    useEffect(() => {
        if (!isSelecting || !scrollContainerRef?.current) return;

        const scroll = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (!scroll) return;

        let frameId: number;
        const autoScroll = () => {
            const rect = scrollContainerRef.current!.getBoundingClientRect();
            const { x, y } = selectionPosRef.current;
            
            let dx = 0, dy = 0;
            if (x < rect.left + SCROLL_EDGE_THRESHOLD) dx = -SCROLL_SPEED;
            else if (x > rect.right - SCROLL_EDGE_THRESHOLD) dx = SCROLL_SPEED;
            if (y < rect.top + SCROLL_EDGE_THRESHOLD) dy = -SCROLL_SPEED;
            else if (y > rect.bottom - SCROLL_EDGE_THRESHOLD) dy = SCROLL_SPEED;

            if (dx || dy) {
                scroll.scrollLeft += dx;
                scroll.scrollTop += dy;
                updateSelection();
            }

            frameId = requestAnimationFrame(autoScroll);
        };

        frameId = requestAnimationFrame(autoScroll);
        return () => cancelAnimationFrame(frameId);
    }, [isSelecting, scrollContainerRef, updateSelection]);

    // handle mouse events
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

    // Render selection rectangle
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        if (!selectionRectRef.current) {
            selectionRectRef.current = svg.append('rect')
                .attr('class', 'selection-rect')
                .attr('pointer-events', 'none')
                .style('display', 'none');
        }

        const rect = selectionRectRef.current;

        if (selectionRect && isSelecting) {
            const { startX, startY, width, height } = selectionRect;
            
            const isDarkMode = document.documentElement.classList.contains('dark');
            
            rect
                .style('display', 'block')
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

        return () => {
            if (selectionRectRef.current) {
                selectionRectRef.current.remove();
                selectionRectRef.current = null;
            }
        };
    }, [svgRef, selectionRect, isSelecting]);

    return {
        selectedGateIds,
        clearSelection,
        isSelecting,
    };
}
