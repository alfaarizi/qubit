import { useState, useRef } from 'react'

import { ChevronRight, ChevronLeft } from 'lucide-react'
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
import { ProjectProvider, useProject } from "@/features/project/ProjectContext";
import { InspectorProvider } from "@/features/inspector/InspectorContext";

const DEFAULT_INSPECTOR_SIZE = 30;
const EXPANDED_INSPECTOR_SIZE = 50;
const COLLAPSED_INSPECTOR_SIZE = 0;

function WorkspaceContent() {
    const { circuits, activeCircuitId, setActiveCircuitId } = useProject()

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
                            <div className="h-full overflow-y-auto p-6 flex flex-col gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <div className="min-h-[45vh] flex-shrink-0 -mb-4">
                                    <Tabs value={activeCircuitId} onValueChange={setActiveCircuitId}>
                                        <TabsList>
                                            {circuits.map(circuit => (
                                                <TabsTrigger key={circuit.id} value={circuit.id}>
                                                    {circuit.symbol}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        {circuits.map(circuit => (
                                            <TabsContent key={circuit.id} value={circuit.id}>
                                                <CircuitProvider circuitId={circuit.id}>
                                                <CircuitToolbar />
                                                    <CircuitCanvas />
                                                </CircuitProvider>
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                </div>
                                <div className="min-h-[53vh] flex-shrink-0">
                                    <ResultsPanel
                                        results={mockResults}
                                        totalShots={1024}
                                        executionTime={0.34}
                                    />
                                </div>
                            </div>
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

export default function WorkspacePage() {
    return (
        <ProjectProvider>
            <InspectorProvider>
                <WorkspaceContent />
            </InspectorProvider>
        </ProjectProvider>
    )
}