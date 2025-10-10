import React, { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";

import type { Gate } from '@/features/gates/types';
import { GATE_CONFIG, GATES } from '@/features/gates/constants';
import { dragState } from '@/lib/dragState';
import { GateIcon } from "@/features/gates/components/GateIcon";

interface GateItemProps {
    gate: Gate;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, gate: Gate) => void;
    onDragEnd: () => void;
}

function DraggableGate({ gate, isDragging, onDragStart, onDragEnd }: GateItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, gate)}
            onDragEnd={onDragEnd}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative mx-auto cursor-grab active:cursor-grabbing transition-all ${
                isDragging ? 'opacity-50 scale-95' : ''
            }`}
            title={gate.description}
        >
            <GateIcon
                gate={gate}
                className={isHovered ? 'shadow-md border-yellow-500' : 'shadow-sm'}
            />
            {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap z-50 border">
                    {gate.description}
                </div>
            )}
        </div>
    );
}

export function GatesPanel() {
    const [isExpanded, setIsExpanded] = useState(true)
    const [showExpandedGrid, setShowExpandedGrid] = useState(true)
    const [draggedGate, setDraggedGate] = useState<string | null>(null);
    const { gateSize } = GATE_CONFIG;

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, gate: Gate) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(gate));
        setDraggedGate(gate.id);
        dragState.set(gate.id);
    };

    const handleDragEnd = () => {
        setDraggedGate(null);
        dragState.clear();
    };

    const toggleExpand = () => {
        if (isExpanded) {
            setIsExpanded(false)
            setShowExpandedGrid(false)
        } else {
            setIsExpanded(true)
            setTimeout(() => setShowExpandedGrid(true), 150)
        }
    }

    /**
     * Calculates panel width: (gateSize × cols) + gaps + padding
     * Constants: 8 (gap-2), 16 (p-2 padding on both sides)
     * @param cols - Number of columns
     * @returns Width in pixels
     */
    const calcPanelWidth = (cols: number) => gateSize * cols + 8 * (cols - 1) + 16

    return (
        <div
            className="h-full transition-all duration-300 ease-in-out"
            style={{ width: `${isExpanded ? calcPanelWidth(4) : calcPanelWidth(2)}px` }}
        >
            <Card className="h-full flex flex-col rounded-none border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <Layers className="h-5 w-5 shrink-0" />
                        {isExpanded && <CardTitle className="truncate">Gates</CardTitle>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={toggleExpand}>
                        {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-2 scroll-smooth">
                    {isExpanded && <p className="text-sm text-muted-foreground mb-4">Drag gates to the circuit canvas</p> }
                    <div className={`grid gap-2 ${showExpandedGrid ? 'grid-cols-4' : 'grid-cols-2'}`}>
                        {GATES.map((gate) => (
                            <DraggableGate
                                key={gate.id}
                                gate={gate}
                                isDragging={draggedGate === gate.id}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}