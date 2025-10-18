import React, { useState, useMemo } from 'react';
import Fuse from 'fuse.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, ChevronDown, Layers, Search } from "lucide-react";

import type { GateInfo } from '@/features/gates/types';
import { GATE_CONFIG, GATES } from '@/features/gates/constants';
import { dragState } from '@/lib/dragState';
import { GateIcon } from "@/features/gates/components/GateIcon";
import { useInspector } from '@/features/inspector/InspectorContext';

interface DraggableGateProps {
    gate: GateInfo;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, gate: GateInfo) => void;
    onDragEnd: () => void;
}

function DraggableGate({ 
    gate, 
    isDragging, 
    onDragStart, 
    onDragEnd 
}: DraggableGateProps) {
    const [isHovered, setIsHovered] = useState(false);
    const { setHoveredGate } = useInspector();

    const handleMouseEnter = () => {
        setIsHovered(true);
        setHoveredGate(gate);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        // Don't clear hoveredGate - persist the last hovered gate
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, gate)}
            onDragEnd={onDragEnd}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative mx-auto cursor-grab active:cursor-grabbing transition-all ${
                isDragging ? 'opacity-50 scale-95' : ''
            }`}
            title={gate.description}
        >
            <GateIcon
                gate={gate}
                className={isHovered ? 'shadow-md border-yellow-500' : 'shadow-sm'}
            />
        </div>
    );
}

interface GateCategoryGroupProps {
    categoryName: string;
    gateList: GateInfo[];
    draggedGateId: string | null;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, gate: GateInfo) => void;
    onDragEnd: () => void;
    gridColumns: number;
}

function GateCategoryGroup({ categoryName, gateList, draggedGateId, onDragStart, onDragEnd, gridColumns }: GateCategoryGroupProps) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
            <CollapsibleTrigger className={`
                flex items-center justify-between w-full px-1 py-2 
                text-sm font-medium text-foreground 
                hover:text-foreground/80 transition-colors`
            }>
                <span>{categoryName}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
                <div className={`grid gap-2 grid-cols-${gridColumns}`}>
                    {gateList.map((gate) => (
                        <DraggableGate
                            key={gate.id}
                            gate={gate}
                            isDragging={draggedGateId === gate.id}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function GatesPanel() {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showExpandedGrid, setShowExpandedGrid] = useState(true);
    const [draggedGate, setDraggedGate] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { gateSize } = GATE_CONFIG;

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, gate: GateInfo) => {
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
            setIsExpanded(false);
            setShowExpandedGrid(false);
        } else {
            setIsExpanded(true);
            setTimeout(() => setShowExpandedGrid(true), 150);
        }
    };

const fuse = useMemo(() => {
    return new Fuse(GATES, {
        keys: [
            { name: 'symbol', weight: 0.4 },
            { name: 'name', weight: 0.35 },
            { name: 'category', weight: 0.15 },
            { name: 'description', weight: 0.1 }
        ],
        threshold: 0.4, // search sensitivity (0.0 = exact, 1.0 = match anything)
        ignoreLocation: true, // match location flexibility
        minMatchCharLength: 1, // minimum match requirements
        includeScore: true,// sorting by relevance
        shouldSort: true, // auto-sort by best match
        findAllMatches: false, // stop at first good match
        useExtendedSearch: false, // keep it simple (no special operators needed)
        distance: 100, // How far to look for pattern match
    });
}, []);

    // filter gates based on search query
    const filteredGates = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return GATES;
        // fuzzy search
        const results = fuse.search(query);
        return results.map(result => result.item);
    }, [searchQuery, fuse]);

    // group gates by category
    const groupedGates = useMemo(() => {
        const grouped: Record<string, GateInfo[]> = {};
        filteredGates.forEach(gate => {
            if (!grouped[gate.category]) {
                grouped[gate.category] = [];
            }
            grouped[gate.category].push(gate);
        });
        return grouped;
    }, [filteredGates]);

    const calcPanelWidth = (cols: number) => gateSize * cols + 8 * (cols - 1) + 16;
    const gridColumns = showExpandedGrid ? 4 : 2;

    return (
        <div
            className="h-full transition-all duration-300 ease-in-out"
            style={{ width: `${isExpanded ? calcPanelWidth(4) : calcPanelWidth(2)}px` }}
        >
            <Card className={`
                h-full flex flex-col rounded-none border-border/50 
                bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 gap-1`
            }>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <Layers className="h-5 w-5 shrink-0" />
                        {isExpanded && <CardTitle className="truncate">Gates</CardTitle>}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 shrink-0 -mr-4" 
                        onClick={toggleExpand}
                    >
                        {isExpanded ? (
                            <ChevronLeft className="h-4 w-4" /> 
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
                    {isExpanded ? (
                        <>
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className={`
                                    absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`
                                }/>
                                <Input
                                    placeholder="Search gates..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                            {/* Gate Categories */}
                            {filteredGates.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                    No gates found
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(groupedGates).map(([categoryName, gateList]) => (
                                        <GateCategoryGroup
                                            key={categoryName}
                                            categoryName={categoryName}
                                            gateList={gateList}
                                            draggedGateId={draggedGate}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                            gridColumns={gridColumns}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Collapsed view */
                        <div className="grid gap-2 grid-cols-2">
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
                    )}
                </CardContent>
            </Card>
        </div>
    );
}