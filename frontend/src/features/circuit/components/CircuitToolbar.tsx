import {
    Undo2,
    Redo2,
    Trash2,
    Play,
    ChevronDown,
    FolderOpen,
    GitBranch,
    Eye,
    EyeOff,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { CircuitExportButton } from "@/features/circuit/components/CircuitExportButton";
import { useCircuitStore, useCircuitSvgRef, useCircuitHistory } from "@/features/circuit/store/CircuitStoreContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { circuitsApi } from "@/lib/api/circuits";

export function CircuitToolbar() {
    const svgRef = useCircuitSvgRef();

    const numQubits = useCircuitStore((state) => state.numQubits);
    const measurements = useCircuitStore((state) => state.measurements);
    const placedGates = useCircuitStore((state) => state.placedGates);
    const showNestedCircuit = useCircuitStore((state) => state.showNestedCircuit);
    const isExecuting = useCircuitStore((state) => state.isExecuting);
    const setShowNestedCircuit = useCircuitStore((state) => state.setShowNestedCircuit);
    const setIsExecuting = useCircuitStore((state) => state.setIsExecuting);
    const reset = useCircuitStore((state) => state.reset);

    const { undo, redo, canUndo, canRedo } = useCircuitHistory();

    useKeyboardShortcuts([
        {
            key: 'z',
            ctrl: true,
            handler: () => canUndo && undo()
        },
        {
            key: 'y',
            ctrl: true,
            handler: () => canRedo && redo()
        },
        {
            key: 'z',
            ctrl: true,
            shift: true,
            handler: () => canRedo && redo()
        }
    ]);

    const handleClear = () => {
        reset({
            placedGates: [],
            numQubits: numQubits,
            measurements: measurements.map(() => true),
            showNestedCircuit: showNestedCircuit,
            isExecuting: false,
        });
    };

    const handleRun = async () => {
        if (placedGates.length === 0) {
            toast.error("No gates to execute");
            return;
        }

        setIsExecuting(true);

        toast.promise(
            async () => await circuitsApi.execute("current-circuit", placedGates),
            {
                loading: "Executing circuit...",
                success: "Circuit executed successfully",
                error: "Failed to execute circuit",
                finally: () => setIsExecuting(false)
            }
        );
    };

    return (
        <div className="w-full h-10 bg-muted border-b flex items-center px-4 gap-2">
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
                onClick={() => undo()}
                disabled={!canUndo}
            >
                <Undo2 className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => redo()}
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

            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 h-9 px-2 rounded-md">
                {
                    showNestedCircuit ? (
                        <Eye className="h-4 w-4"/>
                    ) : (
                        <EyeOff className="h-4 w-4"/>
                    )
                }
                <Switch
                    checked={showNestedCircuit}
                    onCheckedChange={setShowNestedCircuit}
                />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Export & Run */}
            <CircuitExportButton svgRef={svgRef} numQubits={numQubits} placedGates={placedGates} />

            <Button
                size="sm"
                disabled={isExecuting}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                onClick={handleRun}
            >
                {isExecuting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4"/>}
                Run
            </Button>
        </div>
    );
}