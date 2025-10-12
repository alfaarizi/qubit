import { useState, useRef } from 'react'

import { FileCode, ChevronRight, ChevronLeft } from 'lucide-react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import type { ImperativePanelHandle } from "react-resizable-panels"

import { Button } from '@/components/ui/button'
import { Header } from "@/components/layout/Header"
import { Layout } from "@/components/layout/Layout"
import { StatusBar } from "@/components/layout/StatusBar"
import { Panel } from "@/components/layout/Panel"

import { GatesPanel } from "@/features/gates/components/GatesPanel"
import { CircuitCanvas } from "@/features/circuit/components/CircuitCanvas"
import { QasmEditor } from "@/features/inspector/components/QasmEditor"
import { CircuitToolbar } from "@/features/circuit/components/CircuitToolbar.tsx";
import { ResultsPanel } from "@/features/results/components/ResultsPanel.tsx";
import { CircuitProvider } from "@/features/circuit/context/CircuitContext.tsx";

const DEFAULT_INSPECTOR_SIZE = 30;
const EXPANDED_INSPECTOR_SIZE = 50;
const COLLAPSED_INSPECTOR_SIZE = 0;

function WorkspacePage() {
    const inspectorRef = useRef<ImperativePanelHandle>(null)
    const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(true)
    const [isAnimDelated, setIsAnimDelated] = useState(false)

    const toggleInspector = () => {
        const panel = inspectorRef.current
        if (!panel) return
        setIsAnimDelated(true)
        if (panel.getSize() <= COLLAPSED_INSPECTOR_SIZE) {
            panel.resize(DEFAULT_INSPECTOR_SIZE)
        } else {
            panel.resize(COLLAPSED_INSPECTOR_SIZE)
        }
        setTimeout(() => setIsAnimDelated(false), 300)
    }

    const mockResults = [
        { state: '|000⟩', count: 512, probability: 0.5 },
        { state: '|101⟩', count: 307, probability: 0.3 },
        { state: '|110⟩', count: 205, probability: 0.2 },
    ];

    return (
        <CircuitProvider>
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
                            <ResizablePanel defaultSize={70} minSize={30} className="relative">
                                <CircuitToolbar/>
                                <div className="flex-1 overflow-auto p-6 space-y-6">
                                    <div className="h-[45%]">
                                        <CircuitCanvas />
                                    </div>
                                    <div className="h-[53%]">
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
                                className={`overflow-hidden ${isAnimDelated ? 'transition-all duration-300 ease-in-out' : ''}`}
                                style={{ minWidth: "14px" }}
                            >
                                <Panel title="Inspector" icon={FileCode}>
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
        </CircuitProvider>
    )
}

export default WorkspacePage