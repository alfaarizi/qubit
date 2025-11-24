import React, { useRef, useEffect, useCallback, useState, startTransition } from 'react';
import { Undo2, Redo2, Trash2, Play, ChevronDown, FolderOpen, Eye, EyeOff, Square, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CircuitExportButton } from "@/features/circuit/components/CircuitExportButton";
import { useCircuitStore, useCircuitSvgRef, useCircuitHistory, useCircuitId } from "@/features/circuit/store/CircuitStoreContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { circuitsApi, deserializeGateFromAPI } from "@/lib/api/circuits";
import { useComposer } from "@/features/composer/ComposerStoreContext.tsx";
import { useJobStore } from "@/stores/jobStore";
import { useCircuitDAG } from "@/features/circuit/hooks/useCircuitDAG";
import type { Gate } from "@/features/gates/types";
import type { Circuit } from "@/features/circuit/types";
import type { SerializedGate } from "@/types";

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
    const { circuits } = useComposer();
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
    const setPlacedGates = useCircuitStore((state) => state.setPlacedGates);
    const setNumQubits = useCircuitStore((state) => state.setNumQubits);
    const setMeasurements = useCircuitStore((state) => state.setMeasurements);
    const setTags = useCircuitStore((state) => state.setTags);
    const reset = useCircuitStore((state) => state.reset);

    // Subscribe to version to ensure re-renders on every job store update
    const job = useJobStore((state) => {
        void state.version;
        const jobs = Array.from(state.queue.values());
        return jobs.find(j => j.circuitId === circuitId);
    });
    const jobId = job?.jobId || null;

    const { undo, redo, canUndo, canRedo } = useCircuitHistory();
    const { batchInjectGates } = useCircuitDAG();

    const [partitionBackend, setPartitionBackend] = useState<string>('squander');
    const [partitionStrategy, setPartitionStrategy] = useState<string>('kahn');
    const [maxPartitionSize, setMaxPartitionSize] = useState<number>(4);
    const [simulationTimeout, setSimulationTimeout] = useState<number>(0);
    const [simulationOptions, setSimulationOptions] = useState({
        densityMatrix: false,
        entropy: false,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortToastId = useRef<string | number | null>(null);
    const processedUpdatesCount = useRef(0);
    const executionStartTimeRef = useRef<number | null>(null);
    const lastProgressRef = useRef<number>(0);
    const prevJobIdRef = useRef<string | null>(null);
    const importedFilenameRef = useRef<string | null>(null);

    // Reset refs when job ID changes
    if (jobId !== prevJobIdRef.current) {
        prevJobIdRef.current = jobId;
        processedUpdatesCount.current = 0;
        executionStartTimeRef.current = null;
        lastProgressRef.current = 0;
    }

    // Sync execution state with job status
    useEffect(() => {
        if (!job) {
            setIsExecuting(false);
            lastProgressRef.current = 0;
            return;
        }
        switch (job.status) {
            case 'complete':
                setExecutionStatus('Complete!');
                setExecutionProgress(100);
                lastProgressRef.current = 100;
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
                    lastProgressRef.current = 0;
                }
                break;
        }
    }, [job, setExecutionStatus, setExecutionProgress, setIsExecuting]);

    // Process job updates and calculate progress
    useEffect(() => {
        if (!job?.updates.length || processedUpdatesCount.current >= job.updates.length) return;
        const latest = job.updates[job.updates.length - 1];
        processedUpdatesCount.current = job.updates.length;

        // initialize execution start time on first phase message
        if (!executionStartTimeRef.current && latest.type === 'phase') {
            executionStartTimeRef.current = latest.timestamp || Date.now();
        }

        // update progress only if explicitly provided, otherwise keep last known progress
        if (latest.progress !== undefined && latest.progress !== null) {
            lastProgressRef.current = latest.progress;
            setExecutionProgress(latest.progress);
        }

        // build status text with elapsed time
        let statusText = latest.message || `Phase: ${latest.phase}`;
        if (latest.timestamp && executionStartTimeRef.current) {
            const elapsedSec = ((latest.timestamp - executionStartTimeRef.current) / 1000).toFixed(1);
            statusText += ` (${elapsedSec}s)`;
        }

        // update status text for phase and log messages
        if (latest.type === 'phase' || latest.type === 'log') {
            setExecutionStatus(statusText);
        }
    }, [job?.updates, setExecutionStatus, setExecutionProgress]);

    useEffect(() => {
        if (!job || job.jobType !== 'import' || job.status !== 'complete') return;
        const completeUpdate = job.updates.find(u => u.type === 'complete');
        const result = completeUpdate?.result as { num_qubits?: number; placed_gates?: unknown[] } | undefined;
        if (!result || typeof result.num_qubits !== 'number' || !Array.isArray(result.placed_gates)) return;

        const constructGates = async () => {
            const numQubitsValue = result.num_qubits as number;
            const gates = result.placed_gates as unknown[];

            setNumQubits(numQubitsValue);
            setMeasurements(Array(numQubitsValue).fill(true));
            setPlacedGates([], { skipHistory: true });

            // Add import tag
            if (importedFilenameRef.current) {
                setTags([`Imported: ${importedFilenameRef.current}`]);
                importedFilenameRef.current = null;
            }

            const deserializedGates: (Gate | Circuit)[] = gates.map((gateData: unknown) =>
                deserializeGateFromAPI({ depth: 0, ...(gateData as Record<string, unknown>) } as SerializedGate)
            );

            const BATCH_SIZE = 100;
            let allGates: (Gate | Circuit)[] = [];

            for (let i = 0; i < deserializedGates.length; i += BATCH_SIZE) {
                const batch = deserializedGates.slice(i, Math.min(i + BATCH_SIZE, deserializedGates.length));
                allGates = batchInjectGates(batch, allGates);

                startTransition(() => setPlacedGates(allGates, { skipHistory: true }));

                if (i + BATCH_SIZE < deserializedGates.length) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
        };

        void constructGates();
    }, [job, setPlacedGates, setNumQubits, setMeasurements, setTags, batchInjectGates]);

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

        processedUpdatesCount.current = 0;
        executionStartTimeRef.current = null;
        importedFilenameRef.current = file.name;

        const toastId = toast.loading(`Importing ${file.name}...`);

        try {
            const text = await file.text();
            const response = await circuitsApi.importQasm(
                circuitId,
                text,
                sessionId,
                {
                    simulation_timeout: simulationTimeout > 0 ? simulationTimeout : undefined
                }
            );

            if (jobId) {
                useJobStore.getState().dequeueJob(jobId);
            }

            useJobStore.getState().enqueueJob(response.job_id, circuitId, 'import');
            useJobStore.getState().setJobToastId(response.job_id, toastId);
        } catch (error) {
            setIsExecuting(false);
            setExecutionProgress(0);
            setExecutionStatus('');
            toast.dismiss(toastId);

            const errorMessage = (error as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail 
                || (error as Error)?.message || 'Unknown error';
            toast.error('Import failed', {
                description: errorMessage,
                duration: 5000
            });

            console.error('QASM import error:', error);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [circuitId, sessionId, simulationTimeout, jobId, setIsExecuting, setExecutionProgress, setExecutionStatus]);

    const handleRun = useCallback(async () => {
        if (!placedGates.length) {
            toast.error("No gates to execute");
            return;
        }

        processedUpdatesCount.current = 0;
        executionStartTimeRef.current = null;

        const toastId = toast.loading(
            `Executing ${circuit?.name || 'Circuit'} (${partitionStrategy})...`
        );

        try {
            const response = await circuitsApi.partition(
                circuitId,
                numQubits,
                placedGates,
                measurements,
                {
                    max_partition_size: maxPartitionSize,
                    simulation_timeout: simulationTimeout > 0 ? simulationTimeout : undefined,
                    compute_density_matrix: simulationOptions.densityMatrix,
                    compute_entropy: simulationOptions.entropy,
                },
                partitionStrategy,
                sessionId
            );

            if (jobId) {
                useJobStore.getState().dequeueJob(jobId);
            }

            useJobStore.getState().enqueueJob(response.job_id, circuitId);
            useJobStore.getState().setJobToastId(response.job_id, toastId);
        } catch (error) {
            setIsExecuting(false);
            setExecutionProgress(0);
            setExecutionStatus('');
            toast.dismiss(toastId);

            const errorMessage = (error as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail
                || (error as Error)?.message || 'Unknown error';
            toast.error('Partition failed', {
                description: errorMessage,
                duration: 5000
            });

            console.error('Partition error:', error);
        }
    }, [
        placedGates, circuit, circuitId, numQubits, measurements,
        maxPartitionSize, partitionStrategy, sessionId, simulationOptions,
        simulationTimeout, setIsExecuting, setExecutionProgress, setExecutionStatus, jobId
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
                        // dismiss loading toast immediately
                        if (job?.toastId) toast.dismiss(job.toastId);
                        
                        // cancel job on backend, fire and forget
                        circuitsApi.cancelJob(circuitId, jobId).catch(() => {});
                        
                        useJobStore.getState().dequeueJob(jobId);
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
    }, [isExecuting, jobId, circuitId, job?.toastId, setIsExecuting, setExecutionProgress, setExecutionStatus]);

    const handleClear = useCallback(() => {
        reset({
            placedGates: [],
            numQubits,
            measurements: measurements.map(() => true),
            tags: [],
            showNestedCircuit,
            isExecuting: false,
            executionProgress: 0,
            executionStatus: '',
            partitionJobId: null,
            partitionHighlightIds: [],
            partitionHighlightEnabled: false,
        });
    }, [reset, numQubits, measurements, showNestedCircuit]);

    const toggleSimulationOption = useCallback((option: keyof typeof simulationOptions) => {
        setSimulationOptions(prev => ({
            ...prev,
            [option]: !prev[option]
        }));
    }, []);

    return (
        <div className="w-full h-10 bg-muted border-b flex items-center px-2 sm:px-4 gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="circuit-toolbar">
            <div className="flex items-center gap-1 shrink-0">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".qasm"
                    onChange={handleImportQASM}
                    className="hidden"
                    data-testid="qasm-file-input"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button data-testid="file-menu-button" variant="ghost" size="sm" className="gap-1 shrink-0" disabled={isExecuting} title="File">
                            <FolderOpen className="h-4 w-4" />
                            <ChevronDown className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem>New Circuit</DropdownMenuItem>
                        <DropdownMenuItem data-testid="import-qasm-button" onClick={() => fileInputRef.current?.click()}>
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
                <Button data-testid="undo-button" variant="ghost" size="icon" onClick={() => undo()} disabled={!canUndo || isExecuting} className="shrink-0" title="Undo (Ctrl+Z)">
                    <Undo2 className="h-4 w-4" />
                </Button>
                <Button data-testid="redo-button" variant="ghost" size="icon" onClick={() => redo()} disabled={!canRedo || isExecuting} className="shrink-0" title="Redo (Ctrl+Y)">
                    <Redo2 className="h-4 w-4" />
                </Button>
                <Button data-testid="clear-circuit-button" variant="ghost" size="icon" onClick={handleClear} disabled={isExecuting} className="shrink-0" title="Clear circuit">
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
                            <Button data-testid="partition-backend-select" variant="outline" size="sm" disabled={isExecuting} className="h-8 gap-1 sm:gap-1.5 shrink-0 font-medium shadow-sm px-2 sm:px-3">
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
                            <Button data-testid="partition-strategy-select" variant="outline" size="sm" disabled={isExecuting} className="h-8 gap-1 sm:gap-1.5 shrink-0 min-w-[50px] sm:min-w-[80px] font-medium shadow-sm px-2 sm:px-3">
                                <span className="text-xs capitalize truncate">{partitionStrategy}</span>
                                <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Partition Strategy</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {PARTITION_STRATEGIES.map((strategy) => (
                                <DropdownMenuItem key={strategy.value} onClick={() => setPartitionStrategy(strategy.value)} className="cursor-pointer" data-testid={`strategy-${strategy.value}`}>
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
                            <Button data-testid="max-partition-size-select" variant="outline" size="sm" disabled={isExecuting} className="h-8 gap-1 sm:gap-1.5 shrink-0 min-w-[45px] sm:min-w-[60px] font-medium shadow-sm px-2 sm:px-3">
                                <span className="text-xs">{maxPartitionSize}</span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Max Partition Size</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {[3, 4, 5].map((size) => (
                                <DropdownMenuItem key={size} onClick={() => setMaxPartitionSize(size)} data-testid={`max-partition-size-${size}`}>
                                    <div className="flex items-center justify-between w-full">
                                        <span>{size} qubits</span>
                                        {maxPartitionSize === size && <span className="text-green-600">✓</span>}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <Separator orientation="vertical" className="h-5 hidden sm:block" />
                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground hidden xl:inline font-medium">Timeout</span>
                    <div className="relative flex items-center">
                        <Input
                            data-testid="simulation-timeout-input"
                            type="number"
                            min="0"
                            value={simulationTimeout || ''}
                            onChange={(e) => setSimulationTimeout(parseInt(e.target.value) || 0)}
                            onWheel={(e) => e.currentTarget.blur()}
                            disabled={isExecuting}
                            placeholder="0"
                            className="h-8 w-[60px] pr-5 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            title="Simulation timeout in seconds (0 = no timeout)"
                        />
                        <span className="absolute right-1.5 text-xs text-muted-foreground pointer-events-none">s</span>
                    </div>
                </div>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-1 shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button data-testid="simulation-options-button" disabled={isExecuting} className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Simulation options">
                            <Settings className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Simulation Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                            <div className="flex items-center space-x-2 py-1.5">
                                <Checkbox
                                    id="option-fidelity"
                                    checked={true}
                                    disabled={true}
                                    data-testid="option-fidelity"
                                />
                                <label
                                    htmlFor="option-fidelity"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Fidelity Calculation
                                </label>
                            </div>
                            <div className="flex items-center space-x-2 py-1.5">
                                <Checkbox
                                    id="option-state-vector"
                                    checked={true}
                                    disabled={true}
                                    data-testid="option-state-vector"
                                />
                                <label
                                    htmlFor="option-state-vector"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    State Vector & Probabilities
                                </label>
                            </div>
                            <div className="flex items-center space-x-2 py-1.5">
                                <Checkbox
                                    id="option-density-matrix"
                                    checked={simulationOptions.densityMatrix}
                                    onCheckedChange={() => toggleSimulationOption('densityMatrix')}
                                    data-testid="option-density-matrix"
                                />
                                <label
                                    htmlFor="option-density-matrix"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Density Matrices
                                </label>
                            </div>
                            <div className="flex items-center space-x-2 py-1.5">
                                <Checkbox
                                    id="option-entropy"
                                    checked={simulationOptions.entropy}
                                    onCheckedChange={() => toggleSimulationOption('entropy')}
                                    data-testid="option-entropy"
                                />
                                <label
                                    htmlFor="option-entropy"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Entropy Analysis (Rényi)
                                </label>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button data-testid="run-circuit-button" size="icon" disabled={isExecuting} className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0" onClick={() => handleRun()} title="Execute circuit">
                    {isExecuting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4"/>}
                </Button>
                <Button data-testid="abort-execution-button" size="icon" variant="destructive" disabled={!isExecuting} className="disabled:opacity-50 disabled:cursor-not-allowed shrink-0" onClick={handleAbortClick} title="Abort execution">
                    <Square className="h-4 w-4"/>
                </Button>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center shrink-0">
                <CircuitExportButton svgRef={svgRef} numQubits={numQubits} placedGates={placedGates} />
            </div>
        </div>
    );
}