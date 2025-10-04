import { useState, useRef } from 'react'

import { Layers, FileCode, Github, Mail, ChevronRight, ChevronLeft } from 'lucide-react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ImperativePanelHandle } from "react-resizable-panels"

import { Button } from '@/components/ui/button'
import { Header } from "@/components/layout/Header"
import { Layout } from "@/components/layout/Layout"
import { TwoColumnLayout } from "@/components/layout/TwoColumnLayout"
import { StatusBar } from "@/components/layout/StatusBar"
import { Sidebar } from "@/components/layout/Sidebar"
import { Panel } from "@/components/layout/Panel"

import { GatesPanel } from "@/features/gates/components/GatesPanel"
import { CircuitCanvas } from "@/features/circuit/components/CircuitCanvas"
import { QasmEditor } from "@/features/inspector/components/QasmEditor"

function WorkspacePage() {
    const [showInspector, setShowInspector] = useState(true)
    const panelRef = useRef<ImperativePanelHandle>(null)
    const defaultResizeableSize = 30;

    const handleButtonClick = () => {
        const panel = panelRef.current
        if (!panel) return
        if (panel.isCollapsed() || panel.getSize() <= 2) panel.resize(defaultResizeableSize)
        else panel.collapse()
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
                <TwoColumnLayout>
                    <TwoColumnLayout.Left>
                        <Sidebar title="Gates" icon={Layers} side="left">
                            <GatesPanel />
                        </Sidebar>
                    </TwoColumnLayout.Left>

                    <TwoColumnLayout.Right>
                        <ResizablePanelGroup direction="horizontal" className="h-full">
                            <ResizablePanel defaultSize={70} minSize={30} className="relative">
                                <CircuitCanvas />

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="absolute top-1/2 translate-y-2 right-1 translate-x-1/2 z-10 h-24 w-4 p-0 shadow-lg bg-background"
                                    style={{ clipPath: 'polygon(0 20%, 100% 0, 100% 100%, 0 80%)' }}
                                    onClick={handleButtonClick}
                                >
                                    {showInspector ? <ChevronRight className="h-2 w-2" /> : <ChevronLeft className="h-2 w-2" />}
                                </Button>
                            </ResizablePanel>

                            <ResizableHandle withHandle />

                            <ResizablePanel
                                ref={panelRef}
                                defaultSize={defaultResizeableSize}
                                minSize={0}
                                maxSize={70}
                                collapsible
                                onResize={(size) => setShowInspector(size > 1)}
                                className="overflow-hidden"
                            >
                                <Panel title="Inspector" icon={FileCode}>
                                    <QasmEditor />
                                </Panel>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </TwoColumnLayout.Right>
                </TwoColumnLayout>
            </Layout.Content>

            <Layout.Footer>
                <StatusBar />
            </Layout.Footer>
        </Layout>
    )
}

export default WorkspacePage