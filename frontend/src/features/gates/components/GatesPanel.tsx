import React, { useState, useMemo } from 'react';
import Fuse from 'fuse.js';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, ChevronDown, Layers, Search } from "lucide-react";

import type { GateInfo } from '@/features/gates/types';
import type { CircuitInfo } from '@/features/circuit/types';
import { GATE_CONFIG, GATES } from '@/features/gates/constants';
import { dragState } from '@/lib/dragState';
import { GateIcon } from "@/features/gates/components/GateIcon";
import { useCircuitTemplates } from '@/features/circuit/store/CircuitTemplatesStore';
import { useInspector } from '@/features/inspector/InspectorContext';

interface DraggableItemProps {
    item: GateInfo | CircuitInfo;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, item: GateInfo | CircuitInfo) => void;
    onDragEnd: () => void;
}

function DraggableItem({
    item,
    isDragging,
    onDragStart,
    onDragEnd
}: DraggableItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const { setHoveredGate } = useInspector();

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (!('gates' in item)) {
            setHoveredGate(item);
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        // Don't clear hoveredGate - persist the last hovered gate
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            onDragEnd={onDragEnd}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative mx-auto cursor-grab active:cursor-grabbing transition-all ${
                isDragging ? 'opacity-50 scale-95' : ''
            }`}
            title={!('gates' in item) ? item.description : `Circuit: ${item.name}`}
        >
            <GateIcon
                item={item}
                className={isHovered ? 'shadow-md border-yellow-500' : 'shadow-sm'}
            />
        </div>
    );
}

interface CategoryGroupProps {
    categoryName: string;
    items: (GateInfo | CircuitInfo)[];
    draggedItemId: string | null;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, item: GateInfo | CircuitInfo) => void;
    onDragEnd: () => void;
    gridColumns: number;
}

function CategoryGroup({ categoryName, items, draggedItemId, onDragStart, onDragEnd, gridColumns }: CategoryGroupProps) {
    const [isOpen, setIsOpen] = useState(true);

    if (items.length === 0) return null;

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
                    {items.map((item) => (
                        <DraggableItem
                            key={item.id}
                            item={item}
                            isDragging={draggedItemId === item.id}
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
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { circuits } = useCircuitTemplates();
    const { gateSize } = GATE_CONFIG;


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: GateInfo | CircuitInfo) => {
        e.dataTransfer.effectAllowed = 'move';
        if ('gates' in item) {
             e.dataTransfer.setData('application/json', JSON.stringify({ type: 'circuit', circuit: item }));
            dragState.set(`circuit-${item.id}`);
        } else {
            e.dataTransfer.setData('application/json', JSON.stringify(item));
            dragState.set(item.id);
        }
        setDraggedItemId(item.id);
    };

    const handleDragEnd = () => {
        setDraggedItemId(null);
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

    const allItems = useMemo(() => [...GATES, ...circuits], [circuits]);

    const fuse = useMemo(() => {
        return new Fuse(allItems, {
            keys: [
                { name: 'symbol', weight: 0.4 },
                { name: 'name', weight: 0.35 },
                { name: 'category', weight: 0.15 },
                { name: 'description', weight: 0.1 }
            ],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 1,
            includeScore: true,
            shouldSort: true,
            findAllMatches: false,
            useExtendedSearch: false,
            distance: 100,
        });
    }, [allItems]);

    // filter items based on search query
    const filteredItems = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return allItems;
        const results = fuse.search(query);
        return results.map(result => result.item);
    }, [searchQuery, fuse, allItems]);

    // group items by category
    const groupedItems = useMemo(() => {
        const grouped: Record<string, (GateInfo | CircuitInfo)[]> = {};
        filteredItems.forEach(item => {
            const category = 'gates' in item ? 'Custom Partition' : item.category;
            (grouped[category] ||= []).push(item);
        });
        return grouped;
    }, [filteredItems]);

    const calcPanelWidth = (cols: number) => gateSize * cols + 8 * (cols - 1) + 16;
    const gridColumns = showExpandedGrid ? 4 : 2;

    return (
        <div
            className="h-full overflow-hidden transition-all duration-300 ease-in-out"
            style={{ width: `${isExpanded ? calcPanelWidth(4) : calcPanelWidth(2)}px` }}
        >
            <Card className={`
                h-full flex flex-col rounded-none border-border/50
                bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 gap-2 py-4 min-h-0`
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

                {isExpanded && (
                    <div className="px-2 pt-3">
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
                    </div>
                )}

                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full">
                        <div className="p-3 space-y-3">
                            {isExpanded ? (
                                filteredItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-2">
                                        No items found
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(groupedItems).map(([categoryName, items]) => (
                                            <CategoryGroup
                                                key={categoryName}
                                                categoryName={categoryName}
                                                items={items}
                                                draggedItemId={draggedItemId}
                                                onDragStart={handleDragStart}
                                                onDragEnd={handleDragEnd}
                                                gridColumns={gridColumns}
                                            />
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="grid gap-2 grid-cols-2">
                                    {allItems.map((item) => (
                                        <DraggableItem
                                            key={item.id}
                                            item={item}
                                            isDragging={draggedItemId === item.id}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}