import { useState, useCallback, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { Gate } from '@/features/gates/types';
import { GATE_CONFIG } from '@/features/gates/constants';
import { getQubitSpan } from '@/features/gates/utils';

interface SelectionRect {
    startX: number;
    startY: number;
    width: number;
    height: number;
}

interface UseGateSelectionProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    placedGates: Gate[];
    isEnabled?: boolean;
}

export const SELECTION_STYLES = {
    strokeColor: '#eab308',
    strokeWidth: 2.0,
} as const;

export function useGateSelection({
    svgRef,
    placedGates,
    isEnabled = true,
}: UseGateSelectionProps) {
    const [selectedGateIds, setSelectedGateIds] = useState<Set<string>>(new Set());
    const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);
    const selectionRectRef = useRef<d3.Selection<SVGRectElement, unknown, null, undefined> | null>(null);

    const clearSelection = useCallback(() => {
        setSelectedGateIds(new Set());
    }, []);

    const checkGateIntersection = useCallback((gate: Gate, rect: SelectionRect) => {
        const { gateSize, gateSpacing } = GATE_CONFIG;
        const { startQubit, endQubit } = getQubitSpan(gate);

        const gateX = gate.depth * gateSpacing + gateSpacing / 2;
        const gateY = startQubit * gateSpacing + gateSpacing / 2;
        const gateHeight = (endQubit - startQubit + 1) * gateSpacing;

        const gateLeft = gateX - gateSize / 2;
        const gateRight = gateX + gateSize / 2;
        const gateTop = gateY - gateSize / 2;
        const gateBottom = gateTop + gateHeight;

        const rectLeft = Math.min(rect.startX, rect.startX + rect.width);
        const rectRight = Math.max(rect.startX, rect.startX + rect.width);
        const rectTop = Math.min(rect.startY, rect.startY + rect.height);
        const rectBottom = Math.max(rect.startY, rect.startY + rect.height);

        return gateRight >= rectLeft && gateLeft <= rectRight && gateBottom >= rectTop && gateTop <= rectBottom;
    }, []);

    const handleMouseDown = useCallback((event: MouseEvent) => {
        if (!isEnabled || !svgRef.current) return;

        // start selection on left click and not on a gate
        const target = event.target as SVGElement;
        if (event.button !== 0 || target.closest('.gate-element')) return;

        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        startPointRef.current = { x, y };
        setIsSelecting(true);
        setSelectionRect({ startX: x, startY: y, width: 0, height: 0 });
        clearSelection();
    }, [isEnabled, svgRef, clearSelection]);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isSelecting || !startPointRef.current || !svgRef.current) return;

        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;

        const width = currentX - startPointRef.current.x;
        const height = currentY - startPointRef.current.y;

        const newRect = {
            startX: startPointRef.current.x,
            startY: startPointRef.current.y,
            width,
            height,
        };

        setSelectionRect(newRect);

        // Check which gates are in selection
        const selected = new Set<string>();
        placedGates.forEach(gate => {
            if (checkGateIntersection(gate, newRect)) {
                selected.add(gate.id);
            }
        });
        setSelectedGateIds(selected);
    }, [isSelecting, svgRef, placedGates, checkGateIntersection]);

    const handleMouseUp = useCallback(() => {
        setIsSelecting(false);
        setSelectionRect(null);
        startPointRef.current = null;
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

    // hande mouse events
    useEffect(() => {
        if (!isEnabled || !svgRef.current) return;

        const svg = svgRef.current;
        svg.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            svg.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isEnabled, svgRef, handleMouseDown, handleMouseMove, handleMouseUp]);

    // Rrnder selection rectangle
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
                .attr('fill', isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(59, 130, 246, 0.1)')
                .attr('stroke', isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(59, 130, 246, 0.5)')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4,4');
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
