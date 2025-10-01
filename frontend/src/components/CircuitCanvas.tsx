import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CircuitBoard } from "lucide-react";
import * as d3 from 'd3';

interface QubitLabelsProps {
    numQubits: number;
    rowHeight: number;
    footerHeight: number;
    onAddQubit: () => void;
    onRemoveQubit: () => void;
}

function QubitLabels({ numQubits, rowHeight, footerHeight, onAddQubit, onRemoveQubit }: QubitLabelsProps) {
    return (
        <div className="flex flex-col">
            {Array.from({ length: numQubits }, (_, i) => (
                <div key={i} style={{ height: rowHeight }} className="flex items-center justify-center font-mono text-sm">
                    q[{i}]
                </div>
            ))}
            <div style={{ height: footerHeight }} className="flex items-center gap-1">
                <button
                    onClick={onRemoveQubit}
                    disabled={numQubits <= 1}
                    className={`
                        w-6 h-6 rounded border border-border bg-background flex items-center justify-center 
                        hover:bg-accent disabled:opacity-30
                    `}
                >
                    −
                </button>
                <button
                    onClick={onAddQubit}
                    className={`
                        w-6 h-6 rounded border border-border bg-background flex items-center justify-center 
                        hover:bg-accent`}
                >
                    +
                </button>
            </div>
        </div>
    );
}

interface MeasurementTogglesProps {
    measurements: boolean[];
    rowHeight: number;
    onToggle: (index: number) => void;
}

export function MeasurementToggles({ measurements, rowHeight, onToggle }: MeasurementTogglesProps) {
    return (
        <div className="flex flex-col">
            {measurements.map((isMeasured, i) => (
                <div key={i} style={{height: rowHeight}} className="flex items-center justify-center">
                    <button
                        onClick={() => onToggle(i)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer ${
                            isMeasured ? 'bg-yellow-400/30 border-yellow-500' : 'bg-gray-300/30 border-gray-400'
                        }`}
                    >
                        <span
                            className={`text-xs font-bold ${isMeasured ? 'text-yellow-600' : 'text-gray-500'}`}>M</span>
                    </button>
                </div>
            ))}
        </div>
    );
}

export function CircuitCanvas() {
    const [numQubits, setNumQubits] = useState(3);
    const [measurements, setMeasurements] = useState<boolean[]>([true, true, true]);
    const [maxDepth] = useState(10);

    const svgRef = useRef<SVGSVGElement>(null);

    const [scrollContainerWidth, setScrollContainerWidth] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const ROW_HEIGHT = 60;
    const GATE_WIDTH = 50;
    const FOOTER_HEIGHT = 40;

    const addQubit = useCallback(() => {
        setNumQubits(prev => prev + 1);
        setMeasurements(prev => [...prev, true]);
    }, []);

    const removeQubit = useCallback(() => {
        if (numQubits > 1) {
            setNumQubits(prev => prev - 1);
            setMeasurements(prev => prev.slice(0, -1));
        }
    }, [numQubits]);

    const toggleMeasurement = useCallback((index: number) => {
        setMeasurements(prev => {
            const newMeas = [...prev];
            newMeas[index] = !newMeas[index];
            return newMeas;
        });
    }, []);

    useEffect(() => {
        if (!scrollContainerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            setScrollContainerWidth(width);
        });

        resizeObserver.observe(scrollContainerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const contentWidth = maxDepth * GATE_WIDTH;
        const svgWidth = Math.max(scrollContainerWidth || contentWidth, contentWidth);
        const svgHeight = numQubits * ROW_HEIGHT + FOOTER_HEIGHT;

        svg.attr('width', svgWidth).attr('height', svgHeight);

        // Qubit lines
        for (let i = 0; i < numQubits; i++) {
            svg.append('line')
                .attr('x1', 0).attr('y1', i * ROW_HEIGHT + ROW_HEIGHT / 2)
                .attr('x2', svgWidth).attr('y2', i * ROW_HEIGHT + ROW_HEIGHT / 2)
                .attr('class', 'stroke-border').attr('stroke-width', 1);
        }

        // Depth markers
        const markersY = numQubits * ROW_HEIGHT + FOOTER_HEIGHT / 2;
        for (let i = 1; i <= maxDepth; i++) {
            svg.append('text')
                .attr('x', (i - 1) * GATE_WIDTH + GATE_WIDTH / 2)
                .attr('y', markersY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('class', 'fill-muted-foreground text-xs font-mono')
                .text(i);
        }
    }, [numQubits, maxDepth, scrollContainerWidth]);

    return (
        <Card className="h-full flex flex-col border-border/50 bg-card/95 p-4">
            <CardHeader className="flex flex-row items-center space-y-0 min-h-[2rem]">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <CircuitBoard className="h-4 w-4 shrink-0" />
                    <CardTitle className="truncate">Circuit Builder</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex overflow-hidden">
                <QubitLabels
                    numQubits={numQubits}
                    rowHeight={ROW_HEIGHT}
                    footerHeight={FOOTER_HEIGHT}
                    onAddQubit={addQubit}
                    onRemoveQubit={removeQubit}
                />
                <div ref={scrollContainerRef} className="flex-1" style={{ minWidth: GATE_WIDTH }}>
                    <ScrollArea className="h-full w-full">
                        <svg ref={svgRef} style={{ display: 'block', minWidth: maxDepth * GATE_WIDTH + 6}} />
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
                <MeasurementToggles
                    measurements={measurements}
                    rowHeight={ROW_HEIGHT}
                    onToggle={toggleMeasurement}
                />
            </CardContent>
        </Card>
    );
}