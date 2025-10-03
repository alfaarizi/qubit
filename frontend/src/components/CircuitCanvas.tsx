import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CircuitBoard } from "lucide-react";
import * as d3 from 'd3';
import { dragState } from '@/lib/dragState';
import { GATES } from '@/types/gates';
import {CIRCUIT_CONFIG, GATE_STYLES} from '@/lib/styles';
import type { DraggableGate } from '@/types/circuit';
import { useCircuitRenderer } from '@/hooks/useCircuitRenderer';
import { CircuitExportButton } from "@/components/Buttons/CircuitExportButton";

interface QubitLabelsProps {
    numQubits: number;
    onAddQubit: () => void;
    onRemoveQubit: () => void;
}

function QubitLabels({ numQubits, onAddQubit, onRemoveQubit }: QubitLabelsProps) {
    return (
        <div className="flex flex-col">
            {Array.from({ length: numQubits }, (_, i) => (
                <div key={i} style={{ height: GATE_STYLES.gateSpacing }}
                     className="flex items-center justify-center font-mono text-sm">
                    q[{i}]
                </div>
            ))}
            <div style={{ height: CIRCUIT_CONFIG.footerHeight }} className="flex items-center gap-1">
                <button
                        onClick={onRemoveQubit}
                        disabled={numQubits <= 1}
                        className="w-6 h-6 rounded border border-border bg-background flex items-center justify-center hover:bg-accent disabled:opacity-30"
                    >
                    −
                </button>
                <button
                    onClick={onAddQubit}
                    className="w-6 h-6 rounded border border-border bg-background flex items-center justify-center hover:bg-accent"
                >
                    +
                </button>
            </div>
        </div>
    );
}

interface MeasurementTogglesProps {
    measurements: boolean[];
    onToggle: (index: number) => void;
}

export function MeasurementToggles({ measurements, onToggle }: MeasurementTogglesProps) {
    return (
        <div className="flex flex-col">
            {measurements.map((isMeasured, i) => (
                <div key={i} style={{height: GATE_STYLES.gateSpacing}} className="flex items-center justify-center">
                    <button
                        onClick={() => onToggle(i)}
                        className={`w-6 h-6 border-2 flex items-center justify-center cursor-pointer ${
                            isMeasured ? 'bg-yellow-400/30 border-yellow-500' : 'bg-gray-300/30 border-gray-400'
                        }`}
                    >
                        <svg className={`w-full h-full fill-foreground`} viewBox="2 2 26 26">
                            <path d="
                                M 25.2941 11.584
                                H 22.7981
                                L 25.2301 8.008
                                V 7
                                H 21.6141
                                V 8
                                H 23.9101
                                L 21.4861 11.576
                                V 12.584
                                H 25.2941
                                V 11.584
                                Z
                            "/>
                            <path d="
                                M 15.5662 23.4664
                                C 15.5662 24.0836 15.0658 24.584 14.4485 24.584
                                C 13.8313 24.584 13.3309 24.0836 13.3309 23.4664
                                C 13.3309 22.8621 13.8104 22.3699 14.4096 22.3494
                                L 17.1775 17.9208
                                C 16.3359 17.5757 15.4144 17.3855 14.4485 17.3855
                                C 10.4729 17.3855 7.25 20.6084 7.25 24.584
                                H 6
                                C 6 19.918 9.78254 16.1355 14.4485 16.1355
                                C 15.658 16.1355 16.8081 16.3896 17.8483 16.8474
                                L 19.5068 14.1939
                                L 20.5668 14.8564
                                L 18.9545 17.4361C21.3236 18.9327 22.8971 21.5746 22.8971 24.584
                                H 21.6471
                                C 21.6471 22.0216 20.3082 19.7719 18.2919 18.4962
                                L 15.4698 23.0116
                                C 15.5317 23.1505 15.5662 23.3044 15.5662 23.4664Z
                            "/>
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}

export function CircuitCanvas() {
    const GATE_SPACING = GATE_STYLES.gateSpacing;

    const [numQubits, setNumQubits] = useState(CIRCUIT_CONFIG.defaultNumQubits);
    const [maxDepth, ] = useState(CIRCUIT_CONFIG.defaultMaxDepth);
    const [measurements, setMeasurements] = useState<boolean[]>(
        Array(numQubits).fill(true)
    );

    const [placedGates, setPlacedGates] = useState<DraggableGate[]>([]);
    const [previewGate, setPreviewGate] = useState<DraggableGate | null>(null);
    const [dragGateId, setDragGateId] = useState<string | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [scrollContainerWidth, setScrollContainerWidth] = useState(0);

    const addQubit = useCallback(() => {
        setNumQubits(prev => prev + 1);
        setMeasurements(prev => [...prev, true]);
    }, []);

    const removeQubit = useCallback(() => {
        if (numQubits > 1) {
            setNumQubits(prev => prev - 1);
            setMeasurements(prev => prev.slice(0, -1));
            setPlacedGates(prev => prev.filter(g => g.qubit + g.gate.qubits <= numQubits - 1));
        }
    }, [numQubits]);

    const toggleMeasurement = useCallback((index: number) => {
        setMeasurements(prev => {
            const newMeas = [...prev];
            newMeas[index] = !newMeas[index];
            return newMeas;
        });
    }, []);

    const gatesToRender = [
        ...placedGates.map(g => g.id === dragGateId ? { ...g, isPreview: true } : g),
        ...(previewGate ? [previewGate] : [])
    ];

    const { getGridPosition, isValid } = useCircuitRenderer({
        svgRef,
        gates: gatesToRender,
        placedGates,
        numQubits,
        maxDepth,
        onUpdateGatePosition: useCallback((gateId: string, depth: number, qubit: number) => {
            setPlacedGates(prev => prev.map(g => g.id === gateId ? { ...g, depth, qubit } : g));
        }, []),
        onRemoveGate: useCallback((gateId: string) => {
            setPlacedGates(prev => prev.filter(g => g.id !== gateId));
        }, []),
        onShowPreview: useCallback((gate: DraggableGate['gate'], depth: number, qubit: number) => {
            setPreviewGate({ id: 'preview', gate, depth, qubit, isPreview: true });
        }, []),
        onHidePreview: () => setPreviewGate(null),
        onStartDragging: setDragGateId,
        onEndDragging: () => {
            setPreviewGate(null);
            setDragGateId(null);
        }
    });

    const findGateById = useCallback((gateId: string | null) => {
        if (!gateId) return null;
        return GATES.find(g => g.id === gateId) || null;
    }, []);

    // Drag from GatesPanel
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const gate = findGateById(dragState.get());
        if (!gate) return;
        const pos = getGridPosition(e);
        if (!pos) return;
        if (isValid(pos.depth, pos.qubit, gate.qubits)) {
            setPreviewGate({
                id: 'preview',
                gate,
                depth: pos.depth,
                qubit: pos.qubit,
                isPreview: true
            });
        } else {
            setPreviewGate(null);
        }
    }, [getGridPosition, isValid, findGateById]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const gate = findGateById(dragState.get());
        if (!gate) return;
        const pos = getGridPosition(e);
        if (!pos) return;
        // Revalidate position on drop
        if (isValid(pos.depth, pos.qubit, gate.qubits)) {
            setPlacedGates(prev => [...prev, {
                id: `gate_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
                gate,
                depth: pos.depth,
                qubit: pos.qubit,
                isPreview: false
            }]);
        }
        setPreviewGate(null);
    }, [getGridPosition, isValid, findGateById]);

    // Resize observer
    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            setScrollContainerWidth(entries[0].contentRect.width);
        });
        resizeObserver.observe(scrollContainerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Draw circuit lines
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        svg.select('.circuit-background').remove();

        const background = svg.insert('g', ':first-child')
            .attr('class', 'circuit-background');

        const contentWidth = maxDepth * GATE_SPACING;
        const svgWidth = Math.max(scrollContainerWidth || contentWidth, contentWidth);
        const svgHeight = numQubits * GATE_SPACING + CIRCUIT_CONFIG.footerHeight;

        svg.attr('width', svgWidth).attr('height', svgHeight);

        // Qubit lines
        for (let i = 0; i < numQubits; i++) {
            background.append('line')
                .attr('x1', 0).attr('y1', i * GATE_SPACING + GATE_SPACING / 2)
                .attr('x2', svgWidth).attr('y2', i * GATE_SPACING + GATE_SPACING / 2)
                .attr('class', 'stroke-border circuit-line')
                .attr('stroke-width', 2);
        }

        // Depth markers
        const markersY = numQubits * GATE_SPACING + CIRCUIT_CONFIG.footerHeight / 2;
        for (let i = 1; i <= maxDepth; i++) {
            background.append('text')
                .attr('x', (i - 1) * GATE_SPACING + GATE_SPACING / 2)
                .attr('y', markersY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('class', 'fill-muted-foreground text-xs font-mono depth-marker')
                .text(i);
        }
    }, [numQubits, maxDepth, scrollContainerWidth, GATE_SPACING]);

    return (
        <Card className="h-full flex flex-col border-border/50 bg-card/95 p-4">
            <CardHeader className="flex flex-row items-center space-y-0 min-h-[2rem]">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <CircuitBoard className="h-4 w-4 shrink-0" />
                    <CardTitle className="truncate">Circuit Builder</CardTitle>
                </div>
                <div className="overflow-hidden">
                    <CircuitExportButton svgRef={svgRef} numQubits={numQubits} placedGates={placedGates} />
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex overflow-hidden">
                <QubitLabels
                    numQubits={numQubits}
                    onAddQubit={addQubit}
                    onRemoveQubit={removeQubit}
                />
                <div
                    ref={scrollContainerRef}
                    className="flex-1"
                    style={{ minWidth: GATE_SPACING }}
                >
                    <ScrollArea className="h-full w-full">
                        <svg ref={svgRef}
                             style={{ display: 'block', minWidth: maxDepth * GATE_SPACING + 6}}
                             onDragOver={handleDragOver}
                             onDragLeave={() => setPreviewGate(null)}
                             onDrop={handleDrop}
                        />
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
                <MeasurementToggles
                    measurements={measurements}
                    onToggle={toggleMeasurement}
                />
            </CardContent>
        </Card>
    );
}