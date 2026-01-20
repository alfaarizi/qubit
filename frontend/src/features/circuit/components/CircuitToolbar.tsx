import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import {
    Undo2,
    Redo2,
    Trash2,
    Play,
    ChevronDown,
    FolderOpen,
    Eye,
    EyeOff,
    Square,
    Loader2,
    Settings,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { CircuitExportButton } from '@/features/circuit/components/CircuitExportButton';
import { useCircuitStore, useCircuitSvgRef, useCircuitHistory, useCircuitId } from '@/features/circuit/store/CircuitStoreContext';
import { useComposer } from '@/features/composer/ComposerStoreContext.tsx';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useWebSocket } from '@/hooks/useWebSocket';
import { circuitsApi } from '@/lib/api/circuits';
import { useJobStore } from '@/stores/jobStore';
import { useResultsStore } from '@/stores/resultsStore';

import {
    PARTITION_BACKENDS,
    PARTITION_STRATEGIES,
    UNSUPPORTED_GATES,
    MAX_PARTITION_SIZES,
    DEFAULT_SIMULATION_OPTIONS,
} from './CircuitToolbar.constants';
import {
    findUnsupportedGates,
    createJob,
    handleJobError,
} from './CircuitToolbar.helpers';
import type { CircuitToolbarProps, SimulationOptions, AvailableDiagram, DiagramConfig } from './CircuitToolbar.types';
import { useImportedCircuit } from '@/hooks/useImportedCircuit';
import { useJobExecution } from '@/hooks/useJobExecution';

// ============================================================================
// Component
// ============================================================================

export function CircuitToolbar({ sessionId }: CircuitToolbarProps = {}): React.ReactElement {
    // ------------------------------------------------------------------------
    // Store & Context
    // ------------------------------------------------------------------------
    const svgRef = useCircuitSvgRef();
    const { circuits, addNewCircuit } = useComposer();
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

    const { undo, redo, canUndo, canRedo } = useCircuitHistory();
    const results = useResultsStore((state) => state.results[circuitId]);
    const { joinRoom } = useWebSocket({ enabled: true });

    // ------------------------------------------------------------------------
    // Hooks
    // ------------------------------------------------------------------------
    const { job, jobId, resetExecutionRefs } = useJobExecution(circuitId);

    // ------------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------------
    const [partitionBackend, setPartitionBackend] = useState('squander');
    const [partitionStrategy, setPartitionStrategy] = useState('kahn');
    const [maxPartitionSize, setMaxPartitionSize] = useState(4);
    const [simulationTimeout, setSimulationTimeout] = useState(0);
    const [simulationOptions, setSimulationOptions] = useState<SimulationOptions>(DEFAULT_SIMULATION_OPTIONS);

    // ------------------------------------------------------------------------
    // Refs
    // ------------------------------------------------------------------------
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortToastId = useRef<string | number | null>(null);
    const importedFilenameRef = useRef<string | null>(null);

    useImportedCircuit(job, importedFilenameRef);

    // ------------------------------------------------------------------------
    // Handlers
    // ------------------------------------------------------------------------
    const resetExecution = useCallback((): void => {
        setIsExecuting(false);
        setExecutionProgress(0);
        setExecutionStatus('');
    }, [setIsExecuting, setExecutionProgress, setExecutionStatus]);

    // ------------------------------------------------------------------------
    // Derived State
    // ------------------------------------------------------------------------
    const availableDiagrams = useMemo((): AvailableDiagram[] => {
        if (!results) return [];

        const maxSize = results.partition_info?.max_partition_size;
        const strategy = results.partition_info?.strategy;

        const configs: DiagramConfig[] = [
            { id: 'partition-distribution', label: 'Partition Distribution', plotId: 'plot-partition-distribution', group: 'partition', condition: !!results.partition_info?.partitions?.length },
            { id: 'probability-comparison', label: 'Probability Comparison', plotId: 'plot-probability-comparison', group: 'probability', condition: !!(results.original?.probabilities && results.partitioned?.probabilities) },
            { id: 'measurement', label: 'Measurement (Original)', plotId: 'plot-measurement-original', group: 'measurement', condition: !!results.original?.counts },
            { id: 'measurement-partition', label: 'Measurement (Partitioned)', plotId: 'plot-measurement-partitioned', group: 'measurement', condition: !!results.partitioned?.counts },
            { id: 'state-vector', label: 'State Vector (Original)', plotId: 'plot-state-vector-original', group: 'state-vector', condition: !!results.original?.state_vector },
            { id: 'state-vector-partition', label: 'State Vector (Partitioned)', plotId: 'plot-state-vector-partitioned', group: 'state-vector', condition: !!results.partitioned?.state_vector },
            { id: 'density-matrix', label: 'Density Matrix (Original)', plotId: 'plot-density-matrix-original', group: 'density-matrix', condition: !!results.original?.density_matrix },
            { id: 'density-matrix-partition', label: 'Density Matrix (Partitioned)', plotId: 'plot-density-matrix-partitioned', group: 'density-matrix', condition: !!results.partitioned?.density_matrix },
            { id: 'entropy-analysis', label: 'Entropy Analysis', plotId: 'plot-entropy-scaling', group: 'entropy', condition: !!(results.original?.entropy_scaling || results.partitioned?.entropy_scaling) },
        ];

        return configs
            .filter(d => d.condition)
            .map(({ id, label, plotId, group }) => ({ id, label, plotId, group, maxPartitionSize: maxSize, strategy }));
    }, [results]);

    // ------------------------------------------------------------------------
    // Effects
    // ------------------------------------------------------------------------
    useEffect(() => {
        if (!isExecuting && abortToastId.current) {
            toast.dismiss(abortToastId.current);
            abortToastId.current = null;
        }
    }, [isExecuting]);

    useKeyboardShortcuts([
        { key: 'z', ctrl: true, handler: () => canUndo && undo() },
        { key: 'y', ctrl: true, handler: () => canRedo && redo() },
        { key: 'z', ctrl: true, shift: true, handler: () => canRedo && redo() },
    ]);

    // File Import
    const handleImportQASM = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.qasm')) {
            toast.error('Please select a .qasm file');
            return;
        }

        resetExecutionRefs();
        importedFilenameRef.current = file.name;

        const { jobId: newJobId, toastId } = createJob(circuitId, jobId, 'import', `Importing ${file.name}...`);

        try {
            const roomName = `import-${newJobId}`;
            await joinRoom(roomName, newJobId).catch(err => {
                console.warn('Failed to join WebSocket room, continuing anyway:', err);
            });

            const text = await file.text();
            await circuitsApi.importQasm(
                circuitId,
                text,
                sessionId,
                { simulation_timeout: simulationTimeout > 0 ? simulationTimeout : undefined },
                newJobId
            );
        } catch (error) {
            handleJobError(error, newJobId, toastId, 'Import failed', resetExecution);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [circuitId, sessionId, simulationTimeout, jobId, joinRoom, resetExecutionRefs]);

    // Circuit Execution
    const handleRun = useCallback(async () => {
        if (!placedGates.length) {
            toast.error('No gates to execute');
            return;
        }

        const unsupported = findUnsupportedGates(placedGates);
        if (unsupported.size) {
            toast(`Unsupported gates (${Array.from(unsupported).join(', ')})`, {
                description: `Currently, these gates are disabled: ${UNSUPPORTED_GATES.join(', ')}`,
                duration: 4000,
                style: { background: '#FEF3C7', color: '#92400E' },
            });
            return;
        }

        resetExecutionRefs();

        const { jobId: newJobId, toastId } = createJob(
            circuitId,
            jobId,
            'partition',
            `Executing ${circuit?.name || 'Circuit'} (${partitionStrategy})...`
        );

        try {
            const roomName = `partition-${newJobId}`;
            await joinRoom(roomName, newJobId).catch(err => {
                console.warn('Failed to join WebSocket room, continuing anyway:', err);
            });

            await circuitsApi.partition(
                circuitId,
                circuit?.name,
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
                sessionId,
                newJobId
            );
        } catch (error) {
            handleJobError(error, newJobId, toastId, 'Partition failed', resetExecution);
        }
    }, [
        placedGates, circuit, circuitId, numQubits, measurements,
        maxPartitionSize, partitionStrategy, sessionId, simulationOptions,
        simulationTimeout, jobId, joinRoom, resetExecution, resetExecutionRefs,
    ]);

    // Abort Execution
    const handleAbort = useCallback(() => {
        if (!isExecuting) return;

        if (abortToastId.current) {
            document
                .querySelector(`[data-sonner-toast][data-toast-id="${abortToastId.current}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        abortToastId.current = toast('Abort execution?', {
            description: 'All progress will be lost.',
            duration: Infinity,
            action: {
                label: 'Abort',
                onClick: () => {
                    resetExecution();
                    if (abortToastId.current) toast.dismiss(abortToastId.current);
                    abortToastId.current = null;

                    if (jobId) {
                        if (job?.toastId) toast.dismiss(job.toastId);
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
    }, [isExecuting, jobId, circuitId, job?.toastId, resetExecution]);

    // Clear Circuit
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
            partitionHighlightColor: '#14b8a6',
        });
    }, [reset, numQubits, measurements, showNestedCircuit]);

    // Simulation Options
    const toggleSimulationOption = useCallback((option: keyof SimulationOptions) => {
        setSimulationOptions(prev => ({ ...prev, [option]: !prev[option] }));
    }, []);

    // ------------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-12 bg-muted border-b" data-testid="circuit-toolbar">
            <ScrollArea className="w-full h-12 [&>div]:h-12 [&>div]:overflow-y-hidden" type="always">
                <div className="flex items-center px-2 sm:px-4 gap-1 sm:gap-2 h-12 min-w-max py-1">
                    {/* File Menu */}
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
                                <DropdownMenuItem onClick={addNewCircuit}>New Circuit</DropdownMenuItem>
                                <DropdownMenuItem data-testid="import-qasm-button" onClick={() => fileInputRef.current?.click()}>
                                    Import from QASM
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

                    {/* History Controls */}
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

                    {/* Nested Circuit Toggle */}
                    <div className="hidden md:flex items-center gap-1.5 shrink-0 px-1">
                        {showNestedCircuit
                            ? <Eye className={`h-4 w-4 ${isExecuting ? 'opacity-50' : ''}`} />
                            : <EyeOff className={`h-4 w-4 ${isExecuting ? 'opacity-50' : ''}`} />
                        }
                        <Switch checked={showNestedCircuit} onCheckedChange={setShowNestedCircuit} disabled={isExecuting} />
                    </div>

                    <div className="flex-1 min-w-2" />

                    {/* Partition Configuration */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {/* Backend Select */}
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

                        {/* Strategy Select */}
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
                                        <DropdownMenuItem
                                            key={strategy.value}
                                            onClick={() => !strategy.disabled && setPartitionStrategy(strategy.value)}
                                            className={strategy.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                            disabled={strategy.disabled}
                                            data-testid={`strategy-${strategy.value}`}
                                        >
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

                        {/* Max Partition Size */}
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
                                    {MAX_PARTITION_SIZES.map((size) => (
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

                        {/* Timeout Input */}
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

                    {/* Execution Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Simulation Options */}
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
                                    <SimulationOptionCheckbox id="option-fidelity" label="Fidelity Calculation" checked disabled />
                                    <SimulationOptionCheckbox id="option-state-vector" label="State Vector & Probabilities" checked disabled />
                                    <SimulationOptionCheckbox
                                        id="option-density-matrix"
                                        label="Density Matrices"
                                        checked={simulationOptions.densityMatrix}
                                        onCheckedChange={() => toggleSimulationOption('densityMatrix')}
                                    />
                                    <SimulationOptionCheckbox
                                        id="option-entropy"
                                        label="Entropy Analysis (Rényi)"
                                        checked={simulationOptions.entropy}
                                        onCheckedChange={() => toggleSimulationOption('entropy')}
                                    />
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Run Button */}
                        <Button data-testid="run-circuit-button" size="icon" disabled={isExecuting} className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-8 w-8" onClick={handleRun} title="Execute circuit">
                            {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-3 w-4" />}
                        </Button>

                        {/* Abort Button */}
                        <Button data-testid="abort-execution-button" size="icon" variant="destructive" disabled={!isExecuting} className="disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-8 w-8" onClick={handleAbort} title="Abort execution">
                            <Square className="h-4 w-4" />
                        </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

                    {/* Export */}
                    <div className="flex items-center shrink-0">
                        <CircuitExportButton
                            svgRef={svgRef}
                            numQubits={numQubits}
                            placedGates={placedGates}
                            measurements={measurements}
                            availableDiagrams={availableDiagrams}
                            hasPartitions={!!(results?.partition_info?.partitions?.length)}
                            circuitName={circuit?.name || 'circuit'}
                            maxPartitionSize={results?.partition_info?.max_partition_size}
                            strategy={results?.partition_info?.strategy}
                        />
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}

// ============================================================================
// Helper Components
// ============================================================================

interface SimulationOptionCheckboxProps {
    id: string;
    label: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange?: () => void;
}

function SimulationOptionCheckbox({
    id,
    label,
    checked,
    disabled = false,
    onCheckedChange,
}: SimulationOptionCheckboxProps): React.ReactElement {
    return (
        <div className="flex items-center space-x-2 py-1.5">
            <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={onCheckedChange}
                data-testid={id}
            />
            <label
                htmlFor={id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
                {label}
            </label>
        </div>
    );
}
