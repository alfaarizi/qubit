import { useRef, useEffect } from 'react';
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
    Square,
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
import { useCircuitStore, useCircuitSvgRef, useCircuitHistory, useCircuitId } from "@/features/circuit/store/CircuitStoreContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { circuitsApi } from "@/lib/api/circuits";
import { useCircuitExecution } from "@/features/simulation/components/CircuitExecutionProvider";
import { useProject } from "@/features/project/ProjectStoreContext";

export function CircuitToolbar() {
    const svgRef = useCircuitSvgRef();
    const circuitId = useCircuitId();
    const { startExecution, abortExecution } = useCircuitExecution();
    const { circuits } = useProject();
    const circuit = circuits.find(c => c.id === circuitId);
    const circuitSymbol = circuit?.symbol || 'Circuit';

    const numQubits = useCircuitStore((state) => state.numQubits);
    const measurements = useCircuitStore((state) => state.measurements);
    const placedGates = useCircuitStore((state) => state.placedGates);
    const showNestedCircuit = useCircuitStore((state) => state.showNestedCircuit);
    const isExecuting = useCircuitStore((state) => state.isExecuting);
    const setShowNestedCircuit = useCircuitStore((state) => state.setShowNestedCircuit);
    const setIsExecuting = useCircuitStore((state) => state.setIsExecuting);
    const setExecutionProgress = useCircuitStore((state) => state.setExecutionProgress);
    const setExecutionStatus = useCircuitStore((state) => state.setExecutionStatus);
    const reset = useCircuitStore((state) => state.reset);

    const { undo, redo, canUndo, canRedo } = useCircuitHistory();

    const abortToastId = useRef<string | number | null>(null);

    useEffect(() => {
        // Dismiss toast when execution completes
        if (!isExecuting && abortToastId.current !== null) {
            toast.dismiss(abortToastId.current);
            abortToastId.current = null;
        }
    }, [isExecuting]);

    const handleAbortClick = () => {
        if (!isExecuting) return;

        // If toast already exists, just highlight it
        if (abortToastId.current !== null) {
            const toastElement = document.querySelector(`[data-sonner-toast][data-toast-id="${abortToastId.current}"]`);
            if (toastElement) {
                toastElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            return;
        }

        // Show new toast
        abortToastId.current = toast(`Abort ${circuitSymbol} execution?`, {
            description: 'This action cannot be undone and all progress will be lost.',
            duration: Infinity,
            action: {
                label: 'Abort',
                onClick: () => {
                    abortExecution(circuitId);
                    if (abortToastId.current !== null) {
                        toast.dismiss(abortToastId.current);
                        abortToastId.current = null;
                    }
                },
            },
            cancel: {
                label: 'Cancel',
                onClick: () => {
                    if (abortToastId.current !== null) {
                        toast.dismiss(abortToastId.current);
                        abortToastId.current = null;
                    }
                },
            },
            classNames: {
                actionButton: 'bg-red-600 hover:bg-red-700 text-white',
            },
        });
    };

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

    const handleRun = async () => {
        if (placedGates.length === 0) {
            toast.error("No gates to execute");
            return;
        }

        setIsExecuting(true);
        setExecutionProgress(0);
        setExecutionStatus('Submitting circuit to backend...');

        const toastId = toast.loading(`Executing ${circuitSymbol}...`);
        const abortController = new AbortController();
        startExecution(circuitId, toastId, abortController);

        try {
            setExecutionStatus('Processing circuit topology...');
            setExecutionProgress(25);
            await circuitsApi.execute(circuitId, placedGates, abortController.signal);
        } catch (error: unknown) {
            // Don't show error if it was aborted by user
            if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
                return; // User aborted, toast already shown by abortExecution
            }
            if (error && typeof error === 'object' && 'name' in error && error.name === 'CanceledError') {
                return; // Axios cancel error, user aborted
            }
            setIsExecuting(false);
            setExecutionProgress(0);
            setExecutionStatus('');
            toast.error(`Failed to execute ${circuitSymbol}`, { id: toastId });
            console.error("Circuit execution error:", error);
        }
    };

    const handleClear = () => {
        reset({
            placedGates: [],
            numQubits: numQubits,
            measurements: measurements.map(() => true),
            showNestedCircuit: showNestedCircuit,
            isExecuting: false,
            executionProgress: 0,
            executionStatus: '',
        });
    };

    return (
        <div className="w-full h-10 bg-muted border-b flex items-center px-2 sm:px-4 gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* File Menu - Hide text on mobile */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 shrink-0" disabled={isExecuting}>
                        <FolderOpen className="h-4 w-4" />
                        <span className="hidden sm:inline">File</span>
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

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            {/* Undo/Redo */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => undo()}
                disabled={!canUndo || isExecuting}
                className="shrink-0"
            >
                <Undo2 className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => redo()}
                disabled={!canRedo || isExecuting}
                className="shrink-0"
            >
                <Redo2 className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 hidden md:block" />

            {/* Partition & Clear - Hide on small screens */}
            <Button variant="ghost" size="sm" className="gap-2 shrink-0 hidden md:flex" disabled={isExecuting}>
                <GitBranch className="h-4 w-4" />
                Partition
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="gap-2 shrink-0 hidden md:flex"
                onClick={handleClear}
                disabled={isExecuting}
            >
                <Trash2 className="h-4 w-4" />
                Clear
            </Button>

            {/* Clear icon only on mobile */}
            <Button
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                onClick={handleClear}
                disabled={isExecuting}
            >
                <Trash2 className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 hidden lg:block" />

            {/* Show/Hide nested - Hide on smaller screens */}
            <div className="hidden lg:flex items-center gap-2 h-9 px-2 rounded-md shrink-0">
                {
                    showNestedCircuit ? (
                        <Eye className={`h-4 w-4 ${isExecuting ? 'opacity-50' : ''}`}/>
                    ) : (
                        <EyeOff className={`h-4 w-4 ${isExecuting ? 'opacity-50' : ''}`}/>
                    )
                }
                <Switch
                    checked={showNestedCircuit}
                    onCheckedChange={setShowNestedCircuit}
                    disabled={isExecuting}
                />
            </div>

            {/* Spacer */}
            <div className="flex-1 min-w-2" />

            {/* Export & Run - Always visible */}
            <CircuitExportButton svgRef={svgRef} numQubits={numQubits} placedGates={placedGates} />

            <Button
                size="sm"
                disabled={isExecuting}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                onClick={handleRun}
            >
                {isExecuting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4"/>}
                <span className="hidden sm:inline">Run</span>
            </Button>

            <Button
                size="sm"
                variant="destructive"
                disabled={!isExecuting}
                className="gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                onClick={handleAbortClick}
            >
                <Square className="h-4 w-4"/>
                <span className="hidden sm:inline">Abort</span>
            </Button>
        </div>
    );
}