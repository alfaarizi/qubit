import { useState, useRef, memo } from 'react'

import { ChevronRight, ChevronLeft, Plus, X } from 'lucide-react'
import { EditableText } from '@/components/common/EditableText'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import type { ImperativePanelHandle } from "react-resizable-panels"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button'
import { Header } from "@/components/layout/Header"
import { Layout } from "@/components/layout/Layout"
import { StatusBar } from "@/components/layout/StatusBar"
import { Panel } from "@/components/layout/Panel"
import { toast } from "sonner";

import { GatesPanel } from "@/features/gates/components/GatesPanel"
import { CircuitProvider, useCircuitStore, getOrCreateCircuitStore } from "@/features/circuit/store/CircuitStoreContext";
import { CircuitToolbar } from "@/features/circuit/components/CircuitToolbar";
import { CircuitCanvas } from "@/features/circuit/components/CircuitCanvas";
import { CircuitTags } from "@/features/circuit/components/CircuitTags";
import { CIRCUIT_CONFIG } from "@/features/circuit/constants";
import { GateProperties } from "@/features/inspector/components/GateProperties";
import { QasmEditor } from "@/features/inspector/components/QasmEditor"
import { ResultsPanel } from "@/features/results/components/ResultsPanel";
import type { PartitionInfo, SimulationResults } from "@/types";
import { ComposerProvider, useComposer } from "@/features/composer/ComposerStoreContext.tsx";
import { InspectorProvider } from "@/features/inspector/InspectorContext";
import { useJobStore } from "@/stores/jobStore";


const DEFAULT_INSPECTOR_SIZE = 30;
const EXPANDED_INSPECTOR_SIZE = 50;
const COLLAPSED_INSPECTOR_SIZE = 0;

const ExecutionProgressBar = memo(function ExecutionProgressBar() {
    const isExecuting = useCircuitStore((state) => state.isExecuting);
    const executionProgress = useCircuitStore((state) => state.executionProgress);

    if (!isExecuting) return null;

    return (
        <div className="sticky top-0 z-[60] h-1.5 bg-muted/50 overflow-hidden">
            <div
                className="h-full bg-green-600 transition-all duration-500 ease-out will-change-[width]"
                style={{ width: `${executionProgress}%` }}
            />
        </div>
    );
});

const CanvasExecutionOverlay = memo(function CanvasExecutionOverlay() {
    const isExecuting = useCircuitStore((state) => state.isExecuting);
    const executionStatus = useCircuitStore((state) => state.executionStatus);

    if (!isExecuting) return null;

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-background/80 backdrop-blur-sm z-50 pointer-events-none flex items-center justify-center">
            <div className="text-muted-foreground text-sm font-medium">
                {executionStatus || 'Executing circuit...'}
            </div>
        </div>
    );
});

function CircuitTabContent() {
    const isExecuting = useCircuitStore((state) => state.isExecuting);
    const { activeCircuitId } = useComposer();

    useJobStore((state) => state.version);
    const partitionQueue = useJobStore((state) => state.queue);

    const jobs = activeCircuitId ? Array.from(partitionQueue.values()).filter(job => job.circuitId === activeCircuitId) : [];
    const latestCompletedJob = jobs
        .filter(job => job.status === 'complete')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    const completeUpdate = latestCompletedJob?.updates.find(update => update.type === 'complete');
    const partitionResult = completeUpdate?.result?.partition_info as PartitionInfo | undefined;
    const simulationResults = completeUpdate?.result as SimulationResults | undefined;

    return (
        <>
            <div className="h-[385px] bg-zinc-200/35 dark:bg-zinc-700/35 relative">
                <div className={`h-full ${isExecuting ? 'overflow-hidden' : 'overflow-x-auto'}`}>
                    <CircuitCanvas />
                </div>
                <CanvasExecutionOverlay />
            </div>
            <CircuitTags />
            <div className="mt-4">
                <ResultsPanel
                    circuitId={activeCircuitId || ''}
                    partitionResult={partitionResult}
                    simulationResults={simulationResults}
                />
            </div>
        </>
    );
}

interface SortableTabTriggerProps {
    circuit: any;
    activeCircuitId: string;
    onClose: () => void;
    onUpdateName: (id: string, name: string) => void;
}

function SortableTabTrigger({ circuit, activeCircuitId, onClose, onUpdateName }: SortableTabTriggerProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: circuit.id });

    // Lock dragging to horizontal axis only
    const style = {
        transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <TabsTrigger
            ref={setNodeRef}
            style={style}
            key={circuit.id}
            value={circuit.id}
            data-testid={`circuit-tab-${circuit.id}`}
            className={`cursor-pointer rounded-none rounded-t-lg !shadow-none !border-b-0 border-border group relative pr-8 shrink-0 !p-2.5 !m-0 ${
                activeCircuitId === circuit.id ? '!bg-muted' : '!bg-transparent hover:!bg-accent/50'
            }`}
            {...attributes}
            {...listeners}
        >
            <EditableText
                value={circuit.name}
                onChange={(newName) => onUpdateName(circuit.id, newName)}
                className="text-sm"
                inputClassName="text-sm"
                placeholder="Untitled Circuit"
            />
            <span
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-pointer group/close"
            >
                <X className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover/close:bg-muted-foreground/20 rounded-full p-0.5 transition-all"/>
            </span>
        </TabsTrigger>
    );
}

function ComposerContent() {
    const { circuits, activeCircuitId, setActiveCircuitId, addCircuit, removeCircuit, updateCircuit, reorderCircuits } = useComposer()
    const inspectorRef = useRef<ImperativePanelHandle>(null)
    const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(true)
    const [isAnimDelayed, setIsAnimDelayed] = useState(false)
    const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substring(7)}`)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = circuits.findIndex((c) => c.id === active.id);
            const newIndex = circuits.findIndex((c) => c.id === over.id);

            const newCircuits = [...circuits];
            const [movedCircuit] = newCircuits.splice(oldIndex, 1);
            newCircuits.splice(newIndex, 0, movedCircuit);

            reorderCircuits(newCircuits);
        }
    };

    const requestCircuitClose = (circuitId: string, circuitSymbol: string, onConfirm: () => void) => {
        const jobs = useJobStore.getState().getCircuitJobs(circuitId);
        const hasRunningJob = jobs.some((job) => job.status === 'running' || job.status === 'pending');

        if (hasRunningJob) {
            toast(`Close ${circuitSymbol}?`, {
                description: 'This circuit is executing. Closing will abort it.',
                duration: Infinity,
                action: {
                    label: 'Close & Abort',
                    onClick: () => {
                        jobs.forEach((job) => {
                            if (job.status === 'running' || job.status === 'pending') {
                                if (job.toastId) toast.dismiss(job.toastId);
                                useJobStore.getState().dequeueJob(job.jobId);
                            }
                        });
                        
                        const store = getOrCreateCircuitStore(circuitId);
                        store.getState().setIsExecuting(false);
                        store.getState().setExecutionProgress(0);
                        store.getState().setExecutionStatus('');
                        
                        toast.dismiss();
                        toast.error('Execution aborted');
                        onConfirm();
                    },
                },
                cancel: {
                    label: 'Cancel',
                    onClick: () => {},
                },
                classNames: {
                    actionButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                },
            });
        } else {
            onConfirm();
        }
    };

    const toggleInspector = () => {
        const panel = inspectorRef.current
        if (!panel) return
        setIsAnimDelayed(true)
        if (panel.getSize() <= COLLAPSED_INSPECTOR_SIZE) {
            panel.resize(DEFAULT_INSPECTOR_SIZE)
        } else {
            panel.resize(COLLAPSED_INSPECTOR_SIZE)
        }
        setTimeout(() => setIsAnimDelayed(false), 300)
    }

    return (
        <Layout>
            <Layout.Header>
                <Header
                    githubUrl="https://github.com/alfaarizi/qubit"
                    emailUrl="mailto:ocswom@inf.elte.hu"
                />
            </Layout.Header>

            <Layout.Content>
                <div className="grid grid-cols-[auto_1fr] h-full overflow-hidden">
                    <GatesPanel />
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={70} minSize={30} className="relative overflow-hidden">
                            <Tabs value={activeCircuitId} onValueChange={setActiveCircuitId} className="h-full flex flex-col gap-0">
                                <div className="bg-transparent px-6 pt-5 sticky top-0 z-20">
                                    <h2 className="text-md font-semibold pb-6">Quantum Circuit</h2>
                                    <TabsList className={`w-full justify-start rounded-none rounded-t-lg bg-zinc-200 dark:bg-zinc-900 p-0 gap-0 h-auto min-h-[2.5rem] relative ${activeCircuitId ? '' : 'border-2 border-b-0'}`}>
                                        <div className="flex items-stretch w-full h-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-9.5">
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={handleDragEnd}
                                                modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
                                            >
                                                <SortableContext
                                                    items={circuits.map(c => c.id)}
                                                    strategy={horizontalListSortingStrategy}
                                                >
                                                    {circuits.map(circuit => (
                                                        <SortableTabTrigger
                                                            key={circuit.id}
                                                            circuit={circuit}
                                                            activeCircuitId={activeCircuitId}
                                                            onClose={() => requestCircuitClose(circuit.id, circuit.name, () => {
                                                                removeCircuit(circuit.id);
                                                            })}
                                                            onUpdateName={(id, name) => updateCircuit(id, { name })}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                const nums = circuits.map(c => {
                                                    const match = c.name.match(/Circuit\s*(\d+)/);
                                                    return match ? parseInt(match[1]) : NaN;
                                                }).filter(n => !isNaN(n)).sort((a, b) => a - b);
                                                let next = 1;
                                                for (const n of nums) if (n === next) next++; else break;
                                                const circuitName = circuits.length === 0 ? 'Circuit' : `Circuit ${next}`;
                                                addCircuit({
                                                    id: `circuit-${crypto.randomUUID()}`,
                                                    name: circuitName,
                                                    numQubits: CIRCUIT_CONFIG.defaultNumQubits,
                                                    gates: [],
                                                });
                                            }}
                                            className='absolute right-0.5 bg-zinc-200 dark:bg-zinc-900 hover:!bg-muted !p-0 !m-0'
                                            data-testid="add-circuit-tab-button"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    </TabsList>
                                </div>
                                <div className="flex-1 px-6 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {circuits.length === 0 ? (
                                        <div className="h-full flex items-center justify-center bg-zinc-200/35 dark:bg-zinc-700/35 border border-border">
                                            <p className="text-muted-foreground">Create a circuit to get started</p>
                                        </div>
                                    ) : (
                                        circuits.map(circuit => (
                                            <TabsContent 
                                                key={circuit.id} 
                                                value={circuit.id} 
                                                data-testid={`circuit-tab-content-${circuit.id}`}
                                                className="mt-0 pb-6 data-[state=inactive]:hidden data-[state=active]:block"
                                            >
                                                <CircuitProvider circuitId={circuit.id}>
                                                    <div className="sticky top-0 z-[60] bg-background will-change-transform">
                                                        <CircuitToolbar sessionId={sessionIdRef.current} />
                                                        <ExecutionProgressBar />
                                                    </div>
                                                    <CircuitTabContent />
                                                </CircuitProvider>
                                            </TabsContent>
                                        ))
                                    )}
                                </div>
                            </Tabs>
                            {/* Inspector Toggle Button */}
                            <Button
                                variant="default"
                                size="icon"
                                className={`
                                    absolute top-[calc(50%+1rem)] -right-0.5 z-10 h-20 w-3 p-0
                                    shadow-md bg-border text-foreground hover:bg-green-600 hover:text-white transition-colors
                                `}
                                style={{ clipPath: 'polygon(0 20%, 100% 0, 100% 100%, 0 80%)' }}
                                onClick={toggleInspector}
                            >
                                { isInspectorCollapsed
                                    ? <ChevronLeft className="h-2 w-2" />
                                    : <ChevronRight className="h-2 w-2" />
                                }
                            </Button>
                        </ResizablePanel>

                        <ResizableHandle withHandle/>

                        <ResizablePanel
                            ref={inspectorRef}
                            defaultSize={DEFAULT_INSPECTOR_SIZE}
                            minSize={COLLAPSED_INSPECTOR_SIZE}
                            maxSize={EXPANDED_INSPECTOR_SIZE}
                            onResize={(size) => {
                                setIsInspectorCollapsed(size <= 1)
                            }}
                            className={`overflow-hidden ${isAnimDelayed ? 'transition-all duration-300 ease-in-out' : ''}`}
                            style={{ minWidth: "14px" }}
                        >
                            <Panel>
                                <GateProperties />
                                <QasmEditor />
                            </Panel>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </Layout.Content>

            <Layout.Footer>
                <StatusBar />
            </Layout.Footer>
        </Layout>
    )
}

export default function ComposerPage() {
    return (
        <ComposerProvider>
            <InspectorProvider>
                <ComposerContent />
            </InspectorProvider>
        </ComposerProvider>
    )
}