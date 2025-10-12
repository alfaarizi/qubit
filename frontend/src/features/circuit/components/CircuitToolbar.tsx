import {
    Undo2,
    Redo2,
    Trash2,
    Play,
    ChevronDown,
    FolderOpen,
    GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircuitExportButton } from "@/features/circuit/components/CircuitExportButton.tsx";

import { useCircuit } from "@/features/circuit/context/CircuitContext";
import { useState } from "react";
import type { Gate } from "@/features/gates/types";

export function CircuitToolbar() {
    const { svgRef, numQubits, placedGates, setPlacedGates, setMeasurements } = useCircuit();

    const [history, setHistory] = useState<Gate[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const saveToHistory = (gates: Gate[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(gates);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = () => {
        console.log('undo', canUndo);
        if (canUndo) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setPlacedGates(history[newIndex]);
        }
    };

    const handleRedo = () => {
        console.log('redo', canRedo);
        if (canRedo) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setPlacedGates(history[newIndex]);
        }
    };

    const handleClear = () => {
        setPlacedGates([]);
        setMeasurements(prev => prev.map(() => true));
        saveToHistory([]);
    };

    const handleRun = () => {
        // TODO: Implement circuit execution
        console.log('Running circuit with', placedGates.length, 'gates');
    };

    return (
        <div className="w-full h-10 bg-muted/80 border-b flex items-center px-4 gap-2">
            {/* File Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                        <FolderOpen className="h-4 w-4" />
                        File
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem>New Circuit</DropdownMenuItem>
                    <DropdownMenuItem>Open...</DropdownMenuItem>
                    <DropdownMenuItem>Save</DropdownMenuItem>
                    <DropdownMenuItem>Save As...</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6" />

            {/* Undo/Redo */}
            <Button
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                disabled={!canUndo}
            >
                <Undo2 className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                disabled={!canRedo}
            >
                <Redo2 className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Partition & Clear */}
            <Button variant="ghost" size="sm" className="gap-2">
                <GitBranch className="h-4 w-4" />
                Partition
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={handleClear}
            >
                <Trash2 className="h-4 w-4" />
                Clear
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Export & Run */}
            <CircuitExportButton svgRef={svgRef} numQubits={numQubits} placedGates={placedGates} />

            <Button
                size="sm"
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleRun}
            >
                <Play className="h-4 w-4"/>
                Run
            </Button>
        </div>
    );
}