import { useState, useMemo, useRef } from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useCircuitRenderer } from '@/features/circuit/hooks/useCircuitRenderer';
import { useCircuitDAG } from '@/features/circuit/hooks/useCircuitDAG';
import { GATE_CONFIG, GATE_DEFINITIONS } from '@/features/gates/constants';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import type { Gate } from '@/features/gates/types';
import type { Partition } from '@/types';

interface PartitionCircuitViewerProps {
    partitions: Partition[];
    maxPartitionSize?: number;
}

export function PartitionCircuitViewer({ partitions, maxPartitionSize }: PartitionCircuitViewerProps) {
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

        // Calculate the actual max depth by finding the rightmost gate edge (depth + width)
        const maxD = processedGates.length > 0
            ? Math.max(...processedGates.map(g => g.depth + getItemWidth(g)))
            : 1;

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

    // Calculate statistics
    const totalGates = partitions.reduce((sum, p) => sum + p.num_gates, 0);
    const avgGatesPerPartition = totalGates / partitions.length;
    const maxGatesInPartition = Math.max(...partitions.map(p => p.num_gates));
    const efficiency = maxPartitionSize ? (avgGatesPerPartition / maxPartitionSize) * 100 : 0;

    return (
        <div className="bg-muted border">
            <div className="flex items-center justify-between px-4 py-2 border-b">
                <h3 className="text-sm font-semibold">Partition Viewer</h3>
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

            <div className="bg-background overflow-hidden">
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

            {/* Statistics Footer */}
            {maxPartitionSize && (
                <div className="flex gap-4 px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
                    <span>Avg: {avgGatesPerPartition.toFixed(1)} gates</span>
                    <span>Max: {maxGatesInPartition} gates</span>
                    <span>Efficiency: {efficiency.toFixed(1)}%</span>
                </div>
            )}
        </div>
    );
}

