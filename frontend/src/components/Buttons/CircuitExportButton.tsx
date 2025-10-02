import React, { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { CIRCUIT_CONFIG, GATE_STYLES } from "@/lib/styles";
import * as d3 from 'd3';
import type { DraggableGate } from '@/types/circuit';

interface CircuitExportButtonProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    placedGates: DraggableGate[];
}

export function CircuitExportButton({ svgRef, numQubits, placedGates }: CircuitExportButtonProps) {
    const GATE_SPACING = GATE_STYLES.gateSpacing;

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
        const maxDepth = placedGates.length > 0 ? Math.max(...placedGates.map(g => g.depth)) + 1 : CIRCUIT_CONFIG.defaultMaxDepth;
        const trimmedWidth = maxDepth * GATE_SPACING;

        svg.selectAll('[data-preview="true"]').remove();

        svg.selectAll('.fill-background').attr('fill', 'white').attr('class', null);

        // Add qubit labels
        for (let i = 0; i < numQubits; i++) {
            svg.append('text')
                .attr('x', CIRCUIT_CONFIG.qubitLabelWidth / 2)
                .attr('y', i * GATE_SPACING + GATE_SPACING / 2)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-family', 'monospace')
                .attr('font-size', '14px')
                .attr('fill', 'black')
                .text(`q[${i}]`);
        }

        // Trim circuit lines (only horizontal lines)
        svg.selectAll('.circuit-line')
            .attr('x1', CIRCUIT_CONFIG.qubitLabelWidth)
            .attr('x2', CIRCUIT_CONFIG.qubitLabelWidth + trimmedWidth)
            .attr('stroke', '#e5e7eb')
            .attr('stroke-width', 2);

        svg.selectAll('g:not(.circuit-background)').attr('transform', `translate(${CIRCUIT_CONFIG.qubitLabelWidth}, 0)`);

        // Remove extra depth markers
        svg.selectAll('.depth-marker').each(function(_, i) {
            if (i >= maxDepth) {
                d3.select(this).remove();
            } else {
                const marker = d3.select(this);
                const x = parseFloat(marker.attr('x') || '0');
                marker.attr('x', x + CIRCUIT_CONFIG.qubitLabelWidth)
                    .attr('font-size', '12px')
                    .attr('font-family', 'monospace')
                    .attr('fill', '#6b7280');
                (this as SVGElement).removeAttribute('class');
            }
        });

        const totalWidth = trimmedWidth + CIRCUIT_CONFIG.qubitLabelWidth + GATE_SPACING / 4
        const totalHeight = numQubits * GATE_SPACING + CIRCUIT_CONFIG.footerHeight;

        svg.attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
            .attr('width', totalWidth)
            .attr('height', totalHeight);

        return svg.node()!;
    }, [svgRef, numQubits, placedGates, GATE_SPACING]);

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
                <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
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