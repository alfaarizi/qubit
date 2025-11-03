import { useState, useMemo, useRef } from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useCircuitRenderer } from '@/features/circuit/hooks/useCircuitRenderer';
import { useCircuitDAG } from '@/features/circuit/hooks/useCircuitDAG';
import { GATE_CONFIG, GATE_DEFINITIONS } from '@/features/gates/constants';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import type { Gate } from '@/features/gates/types';

interface GateDetail {
    id: string;
    name: string;
    target_qubits: number[];
    control_qubits: number[];
}

interface PartitionInfo {
    index: number;
    num_gates: number;
    qubits: number[];
    num_qubits: number;
    gates: GateDetail[];
}

interface PartitionViewerProps {
    partitions: PartitionInfo[];
}

export function PartitionCircuitViewer({ partitions }: PartitionViewerProps) {
    const [selectedIndex, setSelectedIndex] = useState<number>(
        partitions.length > 0 ? partitions[0].index : 0
    );
    const svgRef = useRef<SVGSVGElement>(null);
    const { injectGate, getItemWidth } = useCircuitDAG();

    const selectedPartition = useMemo(
        () => partitions.find(p => p.index === selectedIndex) || partitions[0],
        [partitions, selectedIndex]
    );

    const { gates, numQubits, maxDepth } = useMemo(() => {
        if (!selectedPartition) {
            return { gates: [], numQubits: 0, maxDepth: 0 };
        }

        const qubitMap: Record<number, number> = {};
        selectedPartition.qubits.forEach((global, local) => {
            qubitMap[global] = local;
        });

        let processedGates: Gate[] = [];
        let currentDepth = 0;

        selectedPartition.gates.forEach((detail, idx) => {
            const localTargets = detail.target_qubits.map((q: number) => qubitMap[q]);
            const localControls = detail.control_qubits.map((q: number) => qubitMap[q]);

            const gateDef = GATE_DEFINITIONS.find(g => g.symbol === detail.name) || {
                id: detail.id,
                name: detail.name,
                symbol: detail.name,
                description: detail.name,
                color: '#6b7280',
                category: 'custom' as const,
                numTargetQubits: localTargets.length,
                numControlQubits: localControls.length,
            };

            const newGate: Gate = {
                id: `p${selectedPartition.index}-g${idx}`,
                gate: gateDef,
                targetQubits: localTargets,
                controlQubits: localControls,
                depth: currentDepth,
                parents: [],
                children: [],
            };

            processedGates = injectGate(newGate, processedGates, currentDepth) as Gate[];
            
            const injectedGate = processedGates.find(g => g.id === newGate.id);
            if (injectedGate) {
                const gateWidth = getItemWidth(injectedGate);
                currentDepth += gateWidth;
            }
        });

        const maxD = processedGates.length > 0 ? Math.max(...processedGates.map(g => g.depth)) + 1 : 1;

        return {
            gates: processedGates,
            numQubits: selectedPartition.qubits.length,
            maxDepth: maxD,
        };
    }, [selectedPartition, injectGate, getItemWidth]);

    useCircuitRenderer({
        svgRef,
        numQubits,
        maxDepth,
        placedGates: gates,
        draggableGateId: null,
        selectedGateIdsKey: '',
        scrollContainerWidth: null,
        showNestedCircuit: false,
        isExecuting: false,
        handleMouseDown: undefined,
    });

    const canvasWidth = Math.max(maxDepth * GATE_CONFIG.gateSpacing, 400);
    const canvasHeight = numQubits * GATE_CONFIG.qubitSpacing + CIRCUIT_CONFIG.headerHeight + CIRCUIT_CONFIG.footerHeight;

    if (partitions.length === 0) return null;

    return (
        <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Partition Circuit Viewer</h3>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                        {selectedPartition && `${selectedPartition.num_gates} gates • ${selectedPartition.num_qubits} qubits`}
                    </span>
                    <select
                        value={selectedIndex}
                        onChange={(e) => setSelectedIndex(Number(e.target.value))}
                        className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        {partitions.map((partition) => (
                            <option key={partition.index} value={partition.index}>
                                Partition {partition.index}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="border rounded-lg bg-background overflow-hidden">
                <ScrollArea className="w-full" style={{ maxHeight: 400 }}>
                    <div className="flex p-4">
                        <div className="flex flex-col mr-4" style={{ paddingTop: CIRCUIT_CONFIG.headerHeight }}>
                            {selectedPartition?.qubits.map((globalQubit) => (
                                <div 
                                    key={globalQubit} 
                                    style={{ height: GATE_CONFIG.qubitSpacing }}
                                    className="flex items-center justify-center font-mono text-sm"
                                >
                                    q[{globalQubit}]
                                </div>
                            ))}
                        </div>
                        <svg 
                            ref={svgRef}
                            width={canvasWidth} 
                            height={canvasHeight}
                            className="select-none"
                        />
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </div>
    );
}

