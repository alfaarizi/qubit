import React, { useCallback } from 'react';
import { getMaxDepth } from '@/features/gates/utils'
import * as d3 from 'd3';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, ChevronDown } from "lucide-react";

import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import { GATE_CONFIG } from '@/features/gates/constants';
import { getInvolvedQubits } from "@/features/gates/utils.ts";
import { getQASMWithMetadata } from '@/lib/qasm/converter';

export interface DiagramInfo {
    id: string;
    label: string;
    plotId: string;
    group: string;
    // metadata for persistent filename generation
    maxPartitionSize?: number;
    strategy?: string;
}

interface CircuitExportButtonProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    placedGates: (Gate | Circuit)[];
    measurements: boolean[];
    availableDiagrams?: DiagramInfo[];
    hasPartitions?: boolean;
    circuitName?: string;
    maxPartitionSize?: number;
    strategy?: string;
}

export function CircuitExportButton({ svgRef, numQubits, placedGates, measurements, availableDiagrams = [], hasPartitions = false, circuitName = 'circuit', maxPartitionSize, strategy }: CircuitExportButtonProps) {
    const { qubitLabelWidth, footerHeight, headerHeight} = CIRCUIT_CONFIG;
    const { gateSpacing } = GATE_CONFIG;

    // sanitize circuit name for filename
    const sanitizeName = (name: string): string => {
        return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    };

    // build filename based on diagram type
    const buildFilename = (baseType: string, isPartition: boolean = false): string => {
        const sanitized = sanitizeName(circuitName);
        if (isPartition && maxPartitionSize && strategy) {
            return `${baseType}_${maxPartitionSize}_${strategy}_${sanitized}`;
        }
        return `${baseType}_${sanitized}`;
    };

    const prepareSVG = useCallback((sourceElement?: SVGSVGElement) => {
        const sourceRef = sourceElement || svgRef.current;
        if (!sourceRef) return null;

        const svg = d3.select(sourceRef.cloneNode(true) as SVGSVGElement);

        // cleanup
        svg.selectAll('[data-preview="true"]').remove();
        svg.selectAll('.fill-background').attr('fill', 'white').attr('class', null);
        svg.selectAll('.circuit-line').attr('stroke', '#e5e7eb').attr('stroke-width', 2);
        svg.selectAll('text').attr('fill', 'black');

        // get circuit dimensions
        let maxQubits: number, maxDepth: number;
        if (!sourceElement && placedGates.length > 0) {
            maxDepth = getMaxDepth(placedGates) + 1;
            maxQubits = Math.max(...placedGates.flatMap(g => getInvolvedQubits(g))) + 1;
        } else if (sourceElement) {
            const container = sourceElement.parentElement as HTMLElement;
            const numQubitsData = container?.dataset.numQubits;
            const maxDepthData = container?.dataset.maxDepth;
            if (!numQubitsData || !maxDepthData) return null;
            maxQubits = parseInt(numQubitsData);
            maxDepth = parseInt(maxDepthData);
        } else {
            return svg.node()!;
        }

        const trimmedWidth = maxDepth * gateSpacing;
        const totalWidth = trimmedWidth + qubitLabelWidth + gateSpacing / 4;
        const totalHeight = maxQubits * gateSpacing + footerHeight + headerHeight;

        // add qubit labels
        for (let i = 0; i < maxQubits; i++) {
            svg.append('text')
                .attr('x', qubitLabelWidth / 2)
                .attr('y', i * gateSpacing + gateSpacing / 2 + headerHeight)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-family', 'monospace')
                .attr('font-size', '14px')
                .attr('fill', 'black')
                .text(`q[${i}]`);
        }

        // trim circuit lines
        svg.selectAll('.circuit-line').each(function(_, i) {
            if (i >= maxQubits) {
                d3.select(this).remove();
            } else {
                d3.select(this)
                    .attr('x1', qubitLabelWidth)
                    .attr('x2', qubitLabelWidth + trimmedWidth);
            }
        });

        // shift content groups
        svg.selectAll('.gates-group, .circuits-group, .labels-group, .circuit-backgrounds-group')
            .attr('transform', `translate(${qubitLabelWidth}, 0)`);

        // adjust depth markers
        svg.selectAll('.depth-marker').each(function() {
            const marker = d3.select(this);
            const x = parseFloat(marker.attr('x') || '0');
            marker.attr('x', x + qubitLabelWidth)
                .attr('y', totalHeight - footerHeight / 2)
                .attr('font-size', '12px')
                .attr('font-family', 'monospace')
                .attr('fill', '#6b7280');
            (this as SVGElement).removeAttribute('class');
        });

        // add partition boundaries if this is a partition circuit
        if (sourceElement) {
            const container = sourceElement.parentElement as HTMLElement;
            const boundariesData = container?.dataset.partitionBoundaries;
            const partitionMapData = container?.dataset.partitionMap;

            if (boundariesData && partitionMapData) {
                type PartitionData = { index: number; num_gates: number };
                type BoundaryData = { index: number; start: number; end: number };

                const boundaries = JSON.parse(boundariesData) as BoundaryData[];
                const partitions = new Map(
                    (JSON.parse(partitionMapData) as PartitionData[]).map(p => [p.index, p])
                );
                const boundariesGroup = svg.append('g')
                    .attr('class', 'partition-boundaries')
                    .attr('transform', `translate(${qubitLabelWidth}, 0)`);

                boundaries.forEach((boundary) => {
                    const left = boundary.start * gateSpacing;
                    const boundaryWidth = (boundary.end - boundary.start) * gateSpacing;
                    const partition = partitions.get(boundary.index);

                    boundariesGroup.append('rect')
                        .attr('x', left).attr('y', 0)
                        .attr('width', boundaryWidth).attr('height', totalHeight)
                        .attr('fill', 'none').attr('stroke', '#9ca3af')
                        .attr('stroke-width', 2).attr('stroke-dasharray', '5,5')
                        .attr('opacity', 0.3);

                    boundariesGroup.append('rect')
                        .attr('x', left + 8).attr('y', 8)
                        .attr('width', 60).attr('height', 24).attr('rx', 4)
                        .attr('fill', '#f3f4f6').attr('opacity', 0.9);

                    boundariesGroup.append('text')
                        .attr('x', left + 38).attr('y', 24)
                        .attr('text-anchor', 'middle')
                        .attr('font-family', 'system-ui, -apple-system, sans-serif')
                        .attr('font-size', '12px').attr('font-weight', '600')
                        .attr('fill', '#6b7280')
                        .text(`P${boundary.index}${partition ? ` ${partition.num_gates}g` : ''}`);
                });
            }
        }

        // set final dimensions
        svg.attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
            .attr('width', totalWidth)
            .attr('height', totalHeight);

        return svg.node()!;
    }, [svgRef, placedGates, gateSpacing, qubitLabelWidth, footerHeight, headerHeight]);

    const exportCircuit = useCallback((format: 'svg' | 'png', isPartition: boolean = false) => {
        let sourceElement: SVGSVGElement | null = null;

        if (isPartition) {
            const partitionViewerContainer = document.querySelector('[data-testid="results-partition-viewer"]');
            if (!partitionViewerContainer) {
                toast.error('Failed to export partition circuit', {
                    description: 'Partition circuit not found. Please ensure the partition viewer is visible.'
                });
                return;
            }
            sourceElement = partitionViewerContainer.querySelector('svg');
            if (!sourceElement) {
                toast.error('Failed to export partition circuit', {
                    description: 'Partition SVG not found.'
                });
                return;
            }
        }

        const node = prepareSVG(sourceElement || undefined);
        if (!node) {
            toast.error(`Failed to export ${isPartition ? 'partition ' : ''}circuit`);
            return;
        }

        const filename = buildFilename(isPartition ? 'partition' : 'circuit', isPartition);
        const svgString = new XMLSerializer().serializeToString(node);

        if (format === 'svg') {
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.svg`;
            link.click();
            URL.revokeObjectURL(url);
            if (isPartition) toast.success('Partition circuit exported as SVG');
        } else {
            // Create a properly encoded data URL for better browser compatibility
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const img = new window.Image();

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const MAX_DIMENSION = 16384;
                    const scale = Math.min(2, MAX_DIMENSION / img.width, MAX_DIMENSION / img.height);

                    canvas.width = Math.floor(img.width * scale);
                    canvas.height = Math.floor(img.height * scale);

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        URL.revokeObjectURL(url);
                        toast.error('Failed to create canvas for PNG export');
                        return;
                    }

                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob(pngBlob => {
                        if (!pngBlob) {
                            toast.error('Failed to generate PNG');
                            return;
                        }
                        const pngUrl = URL.createObjectURL(pngBlob);
                        const link = document.createElement('a');
                        link.href = pngUrl;
                        link.download = `${filename}.png`;
                        link.click();
                        URL.revokeObjectURL(pngUrl);
                        if (isPartition) toast.success('Partition circuit exported as PNG');
                    }, 'image/png');

                    URL.revokeObjectURL(url);
                } catch (error) {
                    URL.revokeObjectURL(url);
                    console.error('PNG export error:', error);
                    toast.error('Failed to convert to PNG', {
                        description: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            };

            img.onerror = (error) => {
                URL.revokeObjectURL(url);
                console.error('Image load error:', error);
                toast.error('Failed to load SVG for PNG conversion', {
                    description: 'SVG could not be loaded as an image'
                });
            };

            img.src = url;
        }
    }, [prepareSVG, buildFilename]);

    const exportDiagram = useCallback(async (diagram: DiagramInfo, format: 'svg' | 'png') => {
        const graphDiv = document.getElementById(diagram.plotId);
        if (!graphDiv) return;
        try {
            const Plotly = (window as unknown as { Plotly: { toImage: (gd: HTMLElement, opts: object) => Promise<string> } }).Plotly;
            if (!Plotly?.toImage) {
                console.error('Plotly not available on window');
                return;
            }
            const dataUrl = await Plotly.toImage(graphDiv, {
                format,
                width: 1200,
                height: 800,
                scale: 2,
            });

            // use persistent metadata if available
            const size = diagram.maxPartitionSize ?? maxPartitionSize;
            const strat = diagram.strategy ?? strategy;

            // convert diagram id (with "-") to base type (with "_")
            const baseType = diagram.id.replace(/-/g, '_');
            const isPartitionSpecific = baseType.includes('partition');
            const filename = isPartitionSpecific && size && strat
                ? `${baseType}_${size}_${strat}_${sanitizeName(circuitName)}`
                : `${baseType}_${sanitizeName(circuitName)}`;

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename}.${format}`;
            link.click();
        } catch (error) {}
    }, [maxPartitionSize, strategy, circuitName, sanitizeName]);

    const exportAsQASM = useCallback(() => {
        const qasmData = getQASMWithMetadata(numQubits, placedGates, measurements);
        const blob = new Blob([qasmData.code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizeName(circuitName)}.qasm`;
        link.click();
        URL.revokeObjectURL(url);
    }, [numQubits, placedGates, measurements, circuitName, sanitizeName]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1" title="Export">
                    <Download className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        Export as SVG
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => exportCircuit('svg', false)}>
                            Original Circuit
                        </DropdownMenuItem>
                        {hasPartitions && (
                            <DropdownMenuItem onClick={() => exportCircuit('svg', true)}>
                                Partitioned Circuit
                            </DropdownMenuItem>
                        )}
                        {availableDiagrams.length > 0 && <DropdownMenuSeparator />}
                        {availableDiagrams.map((diagram, index) => (
                            <React.Fragment key={`svg-${diagram.id}`}>
                                {index > 0 && diagram.group !== availableDiagrams[index - 1].group && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                    onClick={() => exportDiagram(diagram, 'svg')}
                                >
                                    {diagram.label}
                                </DropdownMenuItem>
                            </React.Fragment>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        Export as PNG
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => exportCircuit('png', false)}>
                            Original Circuit
                        </DropdownMenuItem>
                        {hasPartitions && (
                            <DropdownMenuItem onClick={() => exportCircuit('png', true)}>
                                Partitioned Circuit
                            </DropdownMenuItem>
                        )}
                        {availableDiagrams.length > 0 && <DropdownMenuSeparator />}
                        {availableDiagrams.map((diagram, index) => (
                            <React.Fragment key={`png-${diagram.id}`}>
                                {index > 0 && diagram.group !== availableDiagrams[index - 1].group && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                    onClick={() => exportDiagram(diagram, 'png')}
                                >
                                    {diagram.label}
                                </DropdownMenuItem>
                            </React.Fragment>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={exportAsQASM}>
                    Export as QASM
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}