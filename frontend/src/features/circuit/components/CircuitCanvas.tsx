import { useState, useRef, useCallback, useEffect } from 'react';

import { GateIcon } from "@/features/gates/components/GateIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CircuitBoard } from "lucide-react";

import { useResizeObserver } from "@/hooks/useResizeObserver";
import { useDraggableGate } from "@/features/circuit/hooks/useDraggableGate";
import { useCircuitRenderer } from '@/features/circuit/hooks/useCircuitRenderer';
import { useGateSelection } from '@/features/circuit/hooks/useGateSelection';
import { SelectionContextMenu } from '@/features/circuit/components/SelectionContextMenu';
import { GateContextMenu } from '@/features/circuit/components/GateContextMenu';
import { getInvolvedQubits } from "@/features/gates/utils";

import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import { GATE_CONFIG } from '@/features/gates/constants';
import { useCircuitStore, useCircuitSvgRef } from "@/features/circuit/store/CircuitStoreContext";
import { useCircuitDAG } from "@/features/circuit/hooks/useCircuitDAG";

interface QubitLabelsProps {
    numQubits: number;
    onAddQubit: () => void;
    onRemoveQubit: () => void;
}

function QubitLabels({ numQubits, onAddQubit, onRemoveQubit }: QubitLabelsProps) {
    return (
        <div className="flex flex-col">
            {Array.from({ length: numQubits }, (_, i) => (
                <div key={i} style={{ height: GATE_CONFIG.gateSpacing }}
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
                <div key={i} style={{height: GATE_CONFIG.gateSpacing}} className="flex items-center justify-center">
                    <button
                        onClick={() => onToggle(i)}
                        className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                            isMeasured ? 'bg-yellow-500/75' : 'bg-gray-400/75'
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
    const svgRef = useCircuitSvgRef();

    const numQubits = useCircuitStore((state) => state.numQubits);
    const placedGates = useCircuitStore((state) => state.placedGates);
    const measurements = useCircuitStore((state) => state.measurements);
    const setPlacedGates = useCircuitStore((state) => state.setPlacedGates);
    const updateCircuit = useCircuitStore((state) => state.updateCircuit);

    const [maxDepth] = useState(CIRCUIT_CONFIG.defaultMaxDepth);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const addQubit = useCallback(() => {
        updateCircuit(prev => ({
            numQubits: prev.numQubits + 1,
            measurements: [...prev.measurements, true],
        }));
    }, [updateCircuit])

    const removeQubit = useCallback(() => {
        if (numQubits > 1) {
            updateCircuit(prev => ({
                numQubits: prev.numQubits - 1,
                measurements: prev.measurements.slice(0, -1),
                placedGates: prev.placedGates.filter(g => {
                    return !getInvolvedQubits(g).includes(prev.numQubits - 1);
                }),
            }));
        }
    }, [numQubits, updateCircuit]);

    const toggleMeasurement = useCallback((index: number) => {
        updateCircuit(prev => {
            const newMeas = [...prev.measurements];
            newMeas[index] = !newMeas[index];
            return { measurements: newMeas };
        });
    }, [updateCircuit]);

    const { width: scrollContainerWidth } = useResizeObserver(scrollContainerRef);

    const { moveGate, removeGate, injectGate } = useCircuitDAG();

    const {
        draggableGate,
        dragOffset,
        cursorPos,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleMouseDown,
    } = useDraggableGate({
        svgRef,
        numQubits,
        maxDepth,
        setPlacedGates,
        scrollContainerWidth,
        injectGate,
        moveGate,
        removeGate
    });

    const [preventClearSelection, setPreventClearSelection] = useState(false);
    const { selectedGateIds, clearSelection } = useGateSelection({
        svgRef,
        placedGates,
        isEnabled: !draggableGate,
        scrollContainerRef,
        preventClearSelection,
    });

    // clear selection when dragging starts
    useEffect(() => {
        if (draggableGate && selectedGateIds.size > 0) {
            clearSelection();
        }
    }, [draggableGate, selectedGateIds.size, clearSelection]);

    useCircuitRenderer({
        svgRef,
        numQubits,
        maxDepth,
        placedGates,
        draggableGateId: draggableGate?.id,
        selectedGateIds,
        scrollContainerWidth,
        handleMouseDown,
    });

    return (
        <div onContextMenu={e => e.preventDefault()}>
            <Card className="flex flex-col rounded-none border-border/50 bg-card/95 p-4">
                <CardHeader className="flex flex-row items-center space-y-0 min-h-[2rem]">
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        <CircuitBoard className="h-4 w-4 shrink-0" />
                        <CardTitle className="truncate">Quantum Circuit</CardTitle>
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
                        style={{ minWidth: GATE_CONFIG.gateSpacing }}
                    >
                        <GateContextMenu
                            svgRef={svgRef}
                            isEnabled={selectedGateIds.size <= 0}
                        />
                        <SelectionContextMenu 
                            selectedGateIds={selectedGateIds}
                            onPreventClearSelection={setPreventClearSelection}
                            onClearSelection={clearSelection}
                        >
                            <ScrollArea className="h-full w-full">
                                <svg ref={svgRef}
                                    style={{ display: 'block', minWidth: maxDepth * GATE_CONFIG.gateSpacing + 6}}
                                    onDragEnter={handleDragEnter}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                />
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </SelectionContextMenu>
                    </div>
                    <MeasurementToggles
                        measurements={measurements}
                        onToggle={toggleMeasurement}
                    />
                </CardContent>
            </Card>
            {draggableGate && cursorPos && (
                <GateIcon
                    item={'circuit' in draggableGate ? draggableGate.circuit : draggableGate.gate}
                    className="fixed pointer-events-none z-50"
                    style={{
                        left: 'gate' in draggableGate && draggableGate.gate.numControlQubits + draggableGate.gate.numTargetQubits === 1
                            ? cursorPos.x - dragOffset.x
                            : cursorPos.x,
                        top: 'gate' in draggableGate && draggableGate.gate.numControlQubits + draggableGate.gate.numTargetQubits === 1
                            ? cursorPos.y - dragOffset.y
                            : cursorPos.y,
                        transform: 'translate(-50%, -50%)'
                    }}
                />
            )}
        </div>

    );
}