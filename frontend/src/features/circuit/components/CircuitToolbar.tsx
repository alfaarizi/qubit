import { useRef, useEffect, useState } from 'react';
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
import { usePartition } from "@/hooks/usePartition";
import { useProject } from "@/features/project/ProjectStoreContext";

export function CircuitToolbar() {
    const svgRef = useCircuitSvgRef();
    const { circuits } = useProject();
    const circuitId = useCircuitId();
    const circuit = circuits.find(c => c.id === circuitId);

    const [partitionJobId, setPartitionJobId] = useState<string | null>(null);
    const { updates: partitionUpdates, error: partitionError } = usePartition(partitionJobId);

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
    const executingToastId = useRef<string | number | null>(null);
    const processedUpdatesCount = useRef(0);
    const successToastShown = useRef(false);
    const executionStartTimeRef = useRef<number | null>(null);
    const phasesRef = useRef<Map<string, { timestamp: number; message: string }>>(new Map());

    useEffect(() => {
        if (!partitionUpdates.length) return;
        if (processedUpdatesCount.current >= partitionUpdates.length) return;
        
        const latest = partitionUpdates[partitionUpdates.length - 1];
        processedUpdatesCount.current = partitionUpdates.length;
        
        // Track execution start time on first phase
        if (!executionStartTimeRef.current && latest.type === 'phase') {
            executionStartTimeRef.current = latest.timestamp || Date.now();
        }

        // Calculate progress based on number of phases
        const phaseCount = partitionUpdates.filter(u => u.type === 'phase').length;
        const estimatedTotalPhases = 8; // connecting, connected, preparing, uploading, building, downloading, cleanup, complete (if complete is a phase)
        const progress = Math.min((phaseCount / estimatedTotalPhases) * 100, 100);
        
        // Format timestamp if available
        let statusText = latest.message || `Phase: ${latest.phase}`;
        if (latest.timestamp && executionStartTimeRef.current) {
            const elapsedMs = latest.timestamp - executionStartTimeRef.current;
            const elapsedSec = (elapsedMs / 1000).toFixed(1);
            statusText += ` (${elapsedSec}s)`;
        }
        
        switch (latest.type) {
            case 'phase':
                setExecutionStatus(statusText);
                setExecutionProgress(progress);
                if (latest.phase) {
                    phasesRef.current.set(latest.phase, {
                        timestamp: latest.timestamp || Date.now(),
                        message: latest.message || ''
                    });
                }
                break;
            case 'log':
                if (latest.progress !== undefined) {
                    setExecutionProgress(latest.progress);
                }
                break;
            case 'complete':
                setExecutionStatus('Complete!');
                setExecutionProgress(100);
                setIsExecuting(false);
                if (executingToastId.current) toast.dismiss(executingToastId.current);
                if (abortToastId.current) toast.dismiss(abortToastId.current);
                executingToastId.current = null;
                abortToastId.current = null;
                if (!successToastShown.current) {
                    successToastShown.current = true;
                    toast.success('Partition completed successfully!');
                }
                break;
            case 'error':
                setExecutionStatus(`Error: ${latest.message}`);
                setIsExecuting(false);
                if (executingToastId.current) toast.dismiss(executingToastId.current);
                if (abortToastId.current) toast.dismiss(abortToastId.current);
                executingToastId.current = null;
                abortToastId.current = null;
                toast.error('Partition failed', { description: latest.message });
                break;
        }
    }, [partitionUpdates, setExecutionStatus, setExecutionProgress, setIsExecuting]);

    useEffect(() => {
        if (partitionError) {
            setExecutionStatus(`Connection error: ${partitionError}`);
            setIsExecuting(false);
            toast.error(`Connection error: ${partitionError}`);
        }
    }, [partitionError, setExecutionStatus, setIsExecuting]);

    useEffect(() => {
        if (!isExecuting && abortToastId.current) {
            toast.dismiss(abortToastId.current);
            abortToastId.current = null;
        }
    }, [isExecuting]);

    const handleAbortClick = () => {
        if (!isExecuting) return;

        if (abortToastId.current) {
            const toastElement = document.querySelector(`[data-sonner-toast][data-toast-id="${abortToastId.current}"]`);
            toastElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        abortToastId.current = toast(`Abort ${circuit?.symbol || 'Circuit'} execution?`, {
            description: 'All progress will be lost.',
            duration: Infinity,
            action: {
                label: 'Abort',
                onClick: () => {
                    setIsExecuting(false);
                    setExecutionProgress(0);
                    setExecutionStatus('Aborted');
                    setPartitionJobId(null);
                    
                    if (executingToastId.current) toast.dismiss(executingToastId.current);
                    if (abortToastId.current) toast.dismiss(abortToastId.current);
                    executingToastId.current = null;
                    abortToastId.current = null;
                    
                    toast.error('Execution aborted');
                },
            },
            cancel: {
                label: 'Cancel',
                onClick: () => {
                    if (abortToastId.current) {
                        toast.dismiss(abortToastId.current);
                        abortToastId.current = null;
                    }
                },
            },
            classNames: { actionButton: 'bg-red-600 hover:bg-red-700 text-white' },
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
        if (!placedGates.length) {
            toast.error("No gates to execute");
            return;
        }

        // Reset state
        setIsExecuting(false);
        setExecutionProgress(0);
        setExecutionStatus('');
        setPartitionJobId(null);
        processedUpdatesCount.current = 0;
        successToastShown.current = false;
        executionStartTimeRef.current = null;
        phasesRef.current.clear();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Start execution
        setIsExecuting(true);
        executingToastId.current = toast.loading(`Executing ${circuit?.symbol || 'Circuit'}...`);
        
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const response = await circuitsApi.partition(
                circuitId,
                numQubits,
                placedGates,
                measurements,
                {},
                new AbortController().signal
            );
            
            setPartitionJobId(response.jobId);
            
        } catch (error) {
            const err = error as { name?: string };
            if (err.name === 'AbortError' || err.name === 'CanceledError') return;
            setIsExecuting(false);
            setExecutionProgress(0);
            setExecutionStatus('');
            if (executingToastId.current) toast.dismiss(executingToastId.current);
            executingToastId.current = null;
            toast.error('Connection failed', { 
                description: 'Backend is not running'
            });
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