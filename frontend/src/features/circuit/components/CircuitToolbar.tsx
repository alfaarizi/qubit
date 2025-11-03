import { useRef, useEffect, useCallback, useState } from 'react';
import { Undo2, Redo2, Trash2, Play, ChevronDown, FolderOpen, Eye, EyeOff, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CircuitExportButton } from "@/features/circuit/components/CircuitExportButton";
import { useCircuitStore, useCircuitSvgRef, useCircuitHistory, useCircuitId } from "@/features/circuit/store/CircuitStoreContext";
import { useCircuitDAG } from "@/features/circuit/hooks/useCircuitDAG";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { circuitsApi } from "@/lib/api/circuits";
import { useProject } from "@/features/project/ProjectStoreContext";
import { usePartitionStore } from "@/stores/partitionStore";
import type { Gate } from "@/features/gates/types";
import type { Circuit } from "@/features/circuit/types";

import { deserializeGateFromAPI } from "@/lib/api/circuits";

const ESTIMATED_TOTAL_PHASES = 8;

const PARTITION_BACKENDS = [
    { value: 'squander', label: 'SQUANDER' },
] as const;

const PARTITION_STRATEGIES = [
    { value: 'kahn', label: 'Kahn', description: 'Fast greedy topological sort' },
    { value: 'ilp', label: 'ILP', description: 'Integer linear programming' },
    { value: 'ilp-fusion', label: 'ILP Fusion', description: 'ILP with fusion cost' },
    { value: 'ilp-fusion-ca', label: 'ILP Fusion CA', description: 'ILP fusion with control awareness' },
    { value: 'tdag', label: 'TDAG', description: 'Tree-based DAG partitioning' },
    { value: 'gtqcp', label: 'GTQCP', description: 'TDAG with GTQCP variant' },
    { value: 'qiskit', label: 'Qiskit', description: 'Qiskit partitioning' },
    { value: 'qiskit-fusion', label: 'Qiskit Fusion', description: 'Qiskit with fusion' },
    { value: 'bqskit-Quick', label: 'BQSKit Quick', description: 'BQSKit quick partitioner' },
    { value: 'bqskit-Scan', label: 'BQSKit Scan', description: 'BQSKit scan partitioner' },
    { value: 'bqskit-Greedy', label: 'BQSKit Greedy', description: 'BQSKit greedy partitioner' },
    { value: 'bqskit-Cluster', label: 'BQSKit Cluster', description: 'BQSKit cluster partitioner' },
] as const;

interface CircuitToolbarProps {
    sessionId?: string;
}

export function CircuitToolbar({ sessionId }: CircuitToolbarProps = {}) {
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
    const setNumQubits = useCircuitStore((state) => state.setNumQubits);
    const setPlacedGates = useCircuitStore((state) => state.setPlacedGates);
    const setMeasurements = useCircuitStore((state) => state.setMeasurements);

    const queue = usePartitionStore((state) => state.queue);
    const job = Array.from(queue.values()).find(j => j.circuitId === circuitId);
    const jobId = job?.jobId || null;

    const { undo, redo, canUndo, canRedo } = useCircuitHistory();
    const { injectGate } = useCircuitDAG();
    
    const [partitionBackend, setPartitionBackend] = useState<string>('squander');
    const [partitionStrategy, setPartitionStrategy] = useState<string>('kahn');
    const [maxPartitionSize, setMaxPartitionSize] = useState<number>(4);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortToastId = useRef<string | number | null>(null);
    const processedUpdatesCount = useRef(0);
    const executionStartTimeRef = useRef<number | null>(null);

    // Sync execution state with job status
    useEffect(() => {
        if (!job) {
            setIsExecuting(false);
            return;
        }
        
        switch (job.status) {
            case 'complete':
                setExecutionStatus('Complete!');
                setExecutionProgress(100);
                setIsExecuting(false);
                break;
            case 'error':
                setExecutionStatus(`Error: ${job.error}`);
                setIsExecuting(false);
                break;
            case 'running':
            case 'pending':
                setIsExecuting(true);
                if (job.status === 'pending') {
                    setExecutionStatus('Connecting to SQUANDER...');
                    setExecutionProgress(0);
                }
                break;
        }
    }, [job?.status, jobId, setExecutionStatus, setExecutionProgress, setIsExecuting]);

    // Process job updates
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
                break;
            case 'log':
                if (latest.progress !== undefined) {
                    setExecutionProgress(latest.progress);
                }
                break;
        }
    }, [job?.updates.length, setExecutionStatus, setExecutionProgress]);

    // Clean up abort toast when execution stops
    useEffect(() => {
        if (!isExecuting && abortToastId.current) {
            toast.dismiss(abortToastId.current);
            abortToastId.current = null;
        }
    }, [isExecuting]);

    useKeyboardShortcuts([
        { key: 'z', ctrl: true, handler: () => canUndo && undo() },
        { key: 'y', ctrl: true, handler: () => canRedo && redo() },
        { key: 'z', ctrl: true, shift: true, handler: () => canRedo && redo() }
    ]);

    const handleImportQASM = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!file.name.endsWith('.qasm')) {
            toast.error('Please select a .qasm file');
            return;
        }

        const toastId = toast.loading(`Importing ${file.name}...`);

        try {
            const text = await file.text();
            
            // Upload and parse QASM
            toast.loading('Uploading to server...', { id: toastId });
            const parsed = await circuitsApi.importQasm(circuitId, text, sessionId);
            
            if (parsed.num_qubits === 0) {
                toast.error('No qubits found', { id: toastId });
                return;
            }

            // Transform gates
            const gates = parsed.placed_gates.map(gateData => {
                try {
                    return deserializeGateFromAPI(gateData);
                } catch (error) {
                    console.error('Failed to deserialize gate:', gateData, error);
                    return null;
                }
            }).filter((gate): gate is Gate | Circuit => gate !== null);

            // Build DAG
            setPlacedGates([]);
            setNumQubits(parsed.num_qubits);
            
            const totalGates = gates.length;
            const CHUNK_SIZE = Math.max(25, Math.floor(totalGates / 20));
            let currentGates: Gate[] = [];
            let processed = 0;

            const processChunk = () => {
                const end = Math.min(processed + CHUNK_SIZE, totalGates);
                
                for (let i = processed; i < end; i++) {
                    currentGates = injectGate(gates[i], currentGates) as Gate[];
                }
                
                processed = end;
                const progress = Math.round((processed / totalGates) * 100);
                
                setPlacedGates([...currentGates]);
                toast.loading(`Building circuit... ${progress}%`, { id: toastId });
                
                if (processed < totalGates) {
                    requestAnimationFrame(() => setTimeout(processChunk, 0));
                } else {
                    if (parsed.measurements.length > 0) {
                        setMeasurements(parsed.measurements);
                    }
                    toast.success(
                        `Imported ${totalGates} gate${totalGates !== 1 ? 's' : ''}`,
                        { id: toastId }
                    );
                }
            };

            processChunk();

        } catch (err) {
            console.error('QASM import error:', err);
            toast.error(
                err instanceof Error ? err.message : 'Import failed',
                { id: toastId }
            );
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [circuitId, sessionId, setPlacedGates, setNumQubits, setMeasurements, injectGate]);

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

        setIsExecuting(true);
        const toastId = toast.loading(
            `Executing ${circuit?.symbol || 'Circuit'} (${partitionStrategy})...`
        );

        try {
            const response = await circuitsApi.partition(
                circuitId,
                numQubits,
                placedGates,
                measurements,
                { max_partition_size: maxPartitionSize },
                new AbortController().signal,
                partitionStrategy,
                sessionId
            );

            if (jobId) {
                usePartitionStore.getState().dequeueJob(jobId);
            }

            usePartitionStore.getState().enqueueJob(response.job_id, circuitId);
            usePartitionStore.getState().setJobToastId(response.job_id, toastId);
        } catch (error: any) {
            if (error.name === 'AbortError' || error.name === 'CanceledError') return;

            setIsExecuting(false);
            setExecutionProgress(0);
            setExecutionStatus('');
            toast.dismiss(toastId);
            
            const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
            toast.error('Partition failed', { 
                description: errorMessage,
                duration: 5000
            });
            
            console.error('Partition error:', error);
        }
    }, [
        placedGates, circuit, circuitId, numQubits, measurements, 
        jobId, maxPartitionSize, partitionStrategy, sessionId,
        setIsExecuting, setExecutionProgress, setExecutionStatus
    ]);

    const handleAbortClick = useCallback(() => {
        if (!isExecuting) return;

        if (abortToastId.current) {
            document
                .querySelector(`[data-sonner-toast][data-toast-id="${abortToastId.current}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        abortToastId.current = toast(`Abort execution?`, {
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
                        if (job?.toastId) toast.dismiss(job.toastId);
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
    }, [isExecuting, jobId, job?.toastId, setIsExecuting, setExecutionProgress, setExecutionStatus]);

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
            <div className="flex items-center gap-1 shrink-0">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".qasm"
                    onChange={handleImportQASM}
                    className="hidden"
                />
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
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                            Import from QASM
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Save</DropdownMenuItem>
                        <DropdownMenuItem>Save As...</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => undo()} disabled={!canUndo || isExecuting} className="shrink-0" title="Undo (Ctrl+Z)">
                    <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => redo()} disabled={!canRedo || isExecuting} className="shrink-0" title="Redo (Ctrl+Y)">
                    <Redo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleClear} disabled={isExecuting} className="shrink-0" title="Clear circuit">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <div className="hidden md:flex items-center gap-1.5 shrink-0 px-1">
                {showNestedCircuit ? <Eye className={`h-4 w-4 ${isExecuting ? 'opacity-50' : ''}`}/> : <EyeOff className={`h-4 w-4 ${isExecuting ? 'opacity-50' : ''}`}/>}
                <Switch checked={showNestedCircuit} onCheckedChange={setShowNestedCircuit} disabled={isExecuting} />
            </div>
            <div className="flex-1 min-w-2" />
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground hidden xl:inline font-medium">Backend</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isExecuting} className="h-8 gap-1 sm:gap-1.5 shrink-0 font-medium shadow-sm px-2 sm:px-3">
                                <span className="text-xs hidden sm:inline">{partitionBackend.toUpperCase()}</span>
                                <span className="text-xs sm:hidden">BE</span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Partition Backend</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {PARTITION_BACKENDS.map((backend) => (
                                <DropdownMenuItem key={backend.value} onClick={() => setPartitionBackend(backend.value)}>
                                    <div className="flex items-center justify-between w-full">
                                        <span>{backend.label}</span>
                                        {partitionBackend === backend.value && <span className="text-green-600">✓</span>}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <Separator orientation="vertical" className="h-5 hidden sm:block" />
                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground hidden xl:inline font-medium">Strategy</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isExecuting} className="h-8 gap-1 sm:gap-1.5 shrink-0 min-w-[50px] sm:min-w-[80px] font-medium shadow-sm px-2 sm:px-3">
                                <span className="text-xs capitalize truncate">{partitionStrategy}</span>
                                <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Partition Strategy</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {PARTITION_STRATEGIES.map((strategy) => (
                                <DropdownMenuItem key={strategy.value} onClick={() => setPartitionStrategy(strategy.value)} className="cursor-pointer">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="font-medium flex items-center gap-2">
                                            {strategy.label}
                                            {partitionStrategy === strategy.value && <span className="text-green-600 text-xs">✓</span>}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{strategy.description}</div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <Separator orientation="vertical" className="h-5 hidden sm:block" />
                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground hidden xl:inline font-medium">Qubits</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isExecuting} className="h-8 gap-1 sm:gap-1.5 shrink-0 min-w-[45px] sm:min-w-[60px] font-medium shadow-sm px-2 sm:px-3">
                                <span className="text-xs">{maxPartitionSize}</span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Max Partition Size</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {[3, 4, 5].map((size) => (
                                <DropdownMenuItem key={size} onClick={() => setMaxPartitionSize(size)}>
                                    <div className="flex items-center justify-between w-full">
                                        <span>{size} qubits</span>
                                        {maxPartitionSize === size && <span className="text-green-600">✓</span>}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" disabled={isExecuting} className="gap-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0" onClick={() => handleRun()} title="Execute circuit">
                    {isExecuting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4"/>}
                    <span className="hidden sm:inline">Run</span>
                </Button>
                <Button size="sm" variant="destructive" disabled={!isExecuting} className="gap-1 disabled:opacity-50 disabled:cursor-not-allowed shrink-0" onClick={handleAbortClick} title="Abort execution">
                    <Square className="h-4 w-4"/>
                    <span className="hidden sm:inline">Abort</span>
                </Button>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center shrink-0">
                <CircuitExportButton svgRef={svgRef} numQubits={numQubits} placedGates={placedGates} />
            </div>
        </div>
    );
}