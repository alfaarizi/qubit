import { useRef, useEffect, useCallback } from 'react';
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
import { useProject } from "@/features/project/ProjectStoreContext";
import { usePartitionStore } from "@/stores/partitionStore";

const ESTIMATED_TOTAL_PHASES = 8;

export function CircuitToolbar() {
    const svgRef = useCircuitSvgRef();
    const { circuits } = useProject();
    const circuitId = useCircuitId();
    const circuit = circuits.find(c => c.id === circuitId);

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

    usePartitionStore((state) => state.version);
    const queue = usePartitionStore((state) => state.queue);
    const job = Array.from(queue.values()).find(j => j.circuitId === circuitId);
    const jobId = job?.jobId || null;

    const { undo, redo, canUndo, canRedo } = useCircuitHistory();

    const abortToastId = useRef<string | number | null>(null);
    const processedUpdatesCount = useRef(0);
    const executionStartTimeRef = useRef<number | null>(null);
    const phasesRef = useRef<Map<string, { timestamp: number; message: string }>>(new Map());

    useEffect(() => {
        if (!job) {
            setIsExecuting(false);
            return;
        }
        switch (job.status) {
            case 'complete': {
                setExecutionStatus('Complete!');
                setExecutionProgress(100);
                setIsExecuting(false);
                break;
            }
            case 'error': {
                setExecutionStatus(`Error: ${job.error}`);
                setIsExecuting(false);
                break;
            }
            case 'running':
            case 'pending': {
                setIsExecuting(true);
                if (job.status === 'pending') {
                    setExecutionStatus('Connecting to SQUANDER...');
                    setExecutionProgress(0);
                }
                break;
            }
        }
    }, [job?.status, jobId, setExecutionStatus, setExecutionProgress, setIsExecuting]);

    useEffect(() => {
        if (!job?.updates.length || processedUpdatesCount.current >= job.updates.length) return;

        const latest = job.updates[job.updates.length - 1];
        processedUpdatesCount.current = job.updates.length;

        if (!executionStartTimeRef.current && latest.type === 'phase') {
            executionStartTimeRef.current = latest.timestamp || Date.now();
        }

        const phaseCount = job.updates.filter((u) => u.type === 'phase').length;
        const progress = Math.min((phaseCount / ESTIMATED_TOTAL_PHASES) * 100, 100);

        let statusText = latest.message || `Phase: ${latest.phase}`;
        if (latest.timestamp && executionStartTimeRef.current) {
            const elapsedSec = ((latest.timestamp - executionStartTimeRef.current) / 1000).toFixed(1);
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
        }
    }, [job?.updates.length, setExecutionStatus, setExecutionProgress]);

    useEffect(() => {
        if (!isExecuting && abortToastId.current) {
            toast.dismiss(abortToastId.current);
            abortToastId.current = null;
        }
    }, [isExecuting]);

    const handleAbortClick = useCallback(() => {
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
                    
                    if (abortToastId.current) toast.dismiss(abortToastId.current);
                    abortToastId.current = null;
                    
                    if (jobId) {
                        if (job?.toastId) {
                            toast.dismiss(job.toastId);
                        }
                        usePartitionStore.getState().dequeueJob(jobId);
                    }
                    
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
    }, [isExecuting, circuit?.symbol, jobId, job?.toastId, setIsExecuting, setExecutionProgress, setExecutionStatus]);

    useKeyboardShortcuts([
        { key: 'z', ctrl: true, handler: () => canUndo && undo() },
        { key: 'y', ctrl: true, handler: () => canRedo && redo() },
        { key: 'z', ctrl: true, shift: true, handler: () => canRedo && redo() }
    ]);

    const handleRun = useCallback(async () => {
        if (!placedGates.length) {
            toast.error("No gates to execute");
            return;
        }

        setIsExecuting(false);
        setExecutionProgress(0);
        setExecutionStatus('');
        processedUpdatesCount.current = 0;
        executionStartTimeRef.current = null;
        phasesRef.current.clear();

        setIsExecuting(true);
        const toastId = toast.loading(`Executing ${circuit?.symbol || 'Circuit'}...`);

        try {
            const response = await circuitsApi.partition(
                circuitId,
                numQubits,
                placedGates,
                measurements,
                {},
                new AbortController().signal
            );

            if (jobId) {
                usePartitionStore.getState().dequeueJob(jobId);
            }

            usePartitionStore.getState().enqueueJob(response.jobId, circuitId);
            usePartitionStore.getState().setJobToastId(response.jobId, toastId);
        } catch (error) {
            const err = error as { name?: string };
            if (err.name === 'AbortError' || err.name === 'CanceledError') return;

            setIsExecuting(false);
            setExecutionProgress(0);
            setExecutionStatus('');
            toast.dismiss(toastId);
            toast.error('Connection failed', { 
                description: 'Backend is not running'
            });
        }
    }, [placedGates, circuit?.symbol, circuitId, numQubits, measurements, jobId, setIsExecuting, setExecutionProgress, setExecutionStatus]);

    const handleClear = useCallback(() => {
        reset({
            placedGates: [],
            numQubits,
            measurements: measurements.map(() => true),
            showNestedCircuit,
            isExecuting: false,
            executionProgress: 0,
            executionStatus: '',
            partitionJobId: null,
        });
    }, [reset, numQubits, measurements, showNestedCircuit]);

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