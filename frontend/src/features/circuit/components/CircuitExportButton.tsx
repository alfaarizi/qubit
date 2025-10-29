import React, { useCallback } from 'react';
import { getMaxDepth } from '@/features/gates/utils'
import * as d3 from 'd3';

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {ChevronDown, Download} from "lucide-react";

import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import { GATE_CONFIG } from '@/features/gates/constants';
import {getInvolvedQubits} from "@/features/gates/utils.ts";

interface CircuitExportButtonProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    placedGates: (Gate | Circuit)[];
}

export function CircuitExportButton({ svgRef, numQubits, placedGates }: CircuitExportButtonProps) {
    const { defaultMaxDepth, qubitLabelWidth, footerHeight, headerHeight} = CIRCUIT_CONFIG;
    const { gateSpacing } = GATE_CONFIG;

    const getTimestamp = (): string => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        const date = `${now.getFullYear().toString().slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        return `${date}_${time}`;
    };

    const prepareSVG = useCallback(() => {
        if (!svgRef.current) return null;

        const svg = d3.select(svgRef.current.cloneNode(true) as SVGSVGElement);

        const maxDepth = placedGates.length > 0 ? getMaxDepth(placedGates) + 1 : defaultMaxDepth;
        const maxQubits = placedGates.length > 0 ? Math.max(...placedGates.flatMap(g => getInvolvedQubits(g))) + 1 : numQubits;
        const trimmedWidth = maxDepth * gateSpacing;

        svg.selectAll('[data-preview="true"]').remove();
        svg.selectAll('.fill-background').attr('fill', 'white').attr('class', null);

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

        // trim circuit lines and remove unused qubits
        svg.selectAll('.circuit-line').each(function(_, i) {
            if (i >= maxQubits) {
                d3.select(this).remove();
            } else {
                d3.select(this)
                    .attr('x1', qubitLabelWidth)
                    .attr('x2', qubitLabelWidth + trimmedWidth)
                    .attr('stroke', '#e5e7eb')
                    .attr('stroke-width', 2);
            }
        });

        svg.selectAll('g:not(.circuit-background)').attr('transform', `translate(${qubitLabelWidth}, 0)`);

        // adjust depth markers
        svg.selectAll('.depth-marker').each(function() {
            const marker = d3.select(this);
            const x = parseFloat(marker.attr('x') || '0');
            marker.attr('x', x + qubitLabelWidth)
                .attr('y', maxQubits * gateSpacing + footerHeight / 2 + headerHeight)
                .attr('font-size', '12px')
                .attr('font-family', 'monospace')
                .attr('fill', '#6b7280');
            (this as SVGElement).removeAttribute('class');
        });

        const totalWidth = trimmedWidth + qubitLabelWidth + gateSpacing / 4
        const totalHeight = maxQubits * gateSpacing + footerHeight + headerHeight;

        svg.attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
            .attr('width', totalWidth)
            .attr('height', totalHeight);

        return svg.node()!;
    }, [svgRef, numQubits, placedGates, gateSpacing, defaultMaxDepth, qubitLabelWidth, footerHeight, headerHeight]);

    const exportAsSVG = useCallback(() => {
        const node = prepareSVG();
        if (!node) return;

        const blob = new Blob([new XMLSerializer().serializeToString(node)], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `circuit_${getTimestamp()}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    }, [prepareSVG]);

    const exportAsPNG = useCallback(() => {
        const node = prepareSVG();
        if (!node) return;

        const blob = new Blob([new XMLSerializer().serializeToString(node)], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 2;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(url);
                return;
            }

            ctx.scale(scale, scale);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(pngBlob => {
                if (!pngBlob) return;
                const pngUrl = URL.createObjectURL(pngBlob);
                const link = document.createElement('a');
                link.href = pngUrl;
                link.download = `circuit_${getTimestamp()}.png`;
                link.click();
                URL.revokeObjectURL(pngUrl);
            });

            URL.revokeObjectURL(url);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
        };

        img.src = url;
    }, [prepareSVG]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportAsSVG}>
                    Export as SVG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportAsPNG}>
                    Export as PNG
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}