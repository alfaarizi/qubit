import { useState, useRef } from 'react'

import { ChevronRight, ChevronLeft, Plus, X } from 'lucide-react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import type { ImperativePanelHandle } from "react-resizable-panels"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button'
import { Header } from "@/components/layout/Header"
import { Layout } from "@/components/layout/Layout"
import { StatusBar } from "@/components/layout/StatusBar"
import { Panel } from "@/components/layout/Panel"

import { GatesPanel } from "@/features/gates/components/GatesPanel"
import { CircuitProvider } from "@/features/circuit/store/CircuitStoreContext";
import { CircuitToolbar } from "@/features/circuit/components/CircuitToolbar";
import { CircuitCanvas } from "@/features/circuit/components/CircuitCanvas"
import { GateProperties } from "@/features/inspector/components/GateProperties";
import { QasmEditor } from "@/features/inspector/components/QasmEditor"
import { ResultsPanel } from "@/features/results/components/ResultsPanel";
import { ProjectProvider, useProject } from "@/features/project/ProjectStoreContext";
import { InspectorProvider } from "@/features/inspector/InspectorContext";
import { CircuitExecutionProvider } from "@/features/simulation/components/CircuitExecutionProvider";

const DEFAULT_INSPECTOR_SIZE = 30;
const EXPANDED_INSPECTOR_SIZE = 50;
const COLLAPSED_INSPECTOR_SIZE = 0;

function ComposerContent() {
    const { circuits, activeCircuitId, setActiveCircuitId, addCircuit, removeCircuit } = useProject()

    const inspectorRef = useRef<ImperativePanelHandle>(null)
    const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(true)
    const [isAnimDelayed, setIsAnimDelayed] = useState(false)

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

    const mockResults = [
        { state: '|000⟩', count: 512, probability: 0.5 },
        { state: '|101⟩', count: 307, probability: 0.3 },
        { state: '|110⟩', count: 205, probability: 0.2 },
    ];

    return (
        <Layout>
            <Layout.Header>
                <Header
                    githubUrl="https://github.com/alfaarizi/qubit"
                    emailUrl="mailto:ocswom@inf.elte.hu"
                    // breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Workspace' }]}
                    // externalLinks={[
                    //     { href: 'mailto:ocswom@inf.elte.hu', icon: Mail, label: 'Email' },
                    //     { href: 'https://github.com/alfaarizi/qubit', icon: GitHub, label: 'GitHub' }
                    // ]}
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
                                    <TabsList className={`w-full justify-start rounded-none rounded-t-lg bg-zinc-200 dark:bg-zinc-900 p-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${activeCircuitId ? '' : 'border-2 border-b-0'}`}>
                                        {circuits.map(circuit => (
                                            <TabsTrigger
                                                key={circuit.id}
                                                value={circuit.id}
                                                className={`h-full cursor-pointer rounded-none rounded-t-lg !shadow-none !border-b-0 border-border group relative pr-8 shrink-0 ${
                                                    activeCircuitId === circuit.id ? '!bg-muted' : '!bg-transparent hover:!bg-accent/50'
                                                }`}
                                            >
                                                {circuit.symbol}
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        removeCircuit(circuit.id);
                                                    }}
                                                    className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-pointer group/close"
                                                >
                                                    <X className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover/close:bg-muted-foreground/20 rounded-full p-0.5 transition-all"/>
                                                </span>
                                            </TabsTrigger>
                                        ))}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const nums = circuits.map(c => parseInt(c.symbol.split('(')[1])).filter(n => !isNaN(n)).sort((a, b) => a - b);
                                                let next = 1;
                                                for (const n of nums) if (n === next) next++; else break;
                                                addCircuit({
                                                    id: `circuit-${crypto.randomUUID()}`,
                                                    symbol: circuits.length === 0 ? 'Circuit' : `Circuit (${next})`,
                                                    color: '#3b82f6',
                                                    gates: [],
                                                });
                                            }}
                                            className='bg-zinc-200 dark:bg-zinc-900 hover:!bg-muted shrink-0'
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </TabsList>
                                    <div className="relative -mb-1.5 pb-1.5">
                                        {activeCircuitId && (
                                            <CircuitProvider circuitId={activeCircuitId}>
                                                <CircuitToolbar />
                                            </CircuitProvider>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 px-6 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {circuits.length === 0 ? (
                                        <div className="h-full flex items-center justify-center bg-zinc-200/35 dark:bg-zinc-700/35 border border-border">
                                            <p className="text-muted-foreground">Create a circuit to get started</p>
                                        </div>
                                    ) : (
                                        circuits.map(circuit => (
                                            <TabsContent key={circuit.id} value={circuit.id} className="mt-0 pb-6">
                                                <CircuitProvider circuitId={circuit.id}>
                                                    <div className="h-[385px] overflow-x-auto bg-zinc-200/35 dark:bg-zinc-700/35">
                                                        <CircuitCanvas />
                                                    </div>
                                                    <div className="mt-4">
                                                        <ResultsPanel
                                                            results={mockResults}
                                                            totalShots={1024}
                                                            executionTime={0.34}
                                                        />
                                                    </div>
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
        <ProjectProvider>
            <InspectorProvider>
                <CircuitExecutionProvider>
                    <ComposerContent />
                </CircuitExecutionProvider>
            </InspectorProvider>
        </ProjectProvider>
    )
}