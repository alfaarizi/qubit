import { useState, useRef } from 'react'

import { Layers, FileCode, Github, Mail, ChevronRight, ChevronLeft } from 'lucide-react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import type { ImperativePanelHandle } from "react-resizable-panels"

import { Button } from '@/components/ui/button'
import { Header } from "@/components/layout/Header"
import { Layout } from "@/components/layout/Layout"
import { StatusBar } from "@/components/layout/StatusBar"
import { Sidebar } from "@/components/layout/Sidebar"
import { Panel } from "@/components/layout/Panel"

import { GatesPanel } from "@/features/gates/components/GatesPanel"
import { CircuitCanvas } from "@/features/circuit/components/CircuitCanvas"
import { QasmEditor } from "@/features/inspector/components/QasmEditor"

const DEFAULT_INSPECTOR_SIZE = 30;
const EXPANDED_INSPECTOR_SIZE = 50;
const COLLAPSED_INSPECTOR_SIZE = 0;

function WorkspacePage() {
    const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(true)
    const inspectorRef = useRef<ImperativePanelHandle>(null)

    const [shouldAnimate, setShouldAnimate] = useState(false)

    const toggleInspector = () => {
        const panel = inspectorRef.current
        if (!panel) return
        setShouldAnimate(true)
        if (panel.getSize() <= COLLAPSED_INSPECTOR_SIZE) {
            panel.resize(DEFAULT_INSPECTOR_SIZE)
        } else {
            panel.resize(COLLAPSED_INSPECTOR_SIZE)
        }
        setTimeout(() => setShouldAnimate(false), 300)
    }

    return (
        <Layout>
            <Layout.Header>
                <Header
                    breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Workspace' }]}
                    externalLinks={[
                        { href: 'mailto:ocswom@inf.elte.hu', icon: Mail, label: 'Email' },
                        { href: 'https://github.com/alfaarizi/qubit', icon: Github, label: 'GitHub' }
                    ]}
                />
            </Layout.Header>

            <Layout.Content>
                <div className="grid grid-cols-[auto_1fr] h-full overflow-hidden">
                    <Sidebar title="Gates" icon={Layers} side="left">
                        <GatesPanel />
                    </Sidebar>
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={70} minSize={30} className="relative"
                        >
                            <CircuitCanvas />
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
                            className={`overflow-hidden ${shouldAnimate ? 'transition-all duration-300 ease-in-out' : ''}`}
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
    )
}

export default WorkspacePage