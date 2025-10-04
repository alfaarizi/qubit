import { Header } from "@/components/layout/Header";
import { SidePanelLayout, SidePanel } from '@/components/layout/SidePanelLayout';
import { GatesPanel } from "@/features/gates/components/GatesPanel";
import { CircuitCanvas } from "@/features/circuit/components/CircuitCanvas";
import { QasmEditor } from "@/features/inspector/components/QasmEditor";
import { Layers, FileCode, Github, Mail } from 'lucide-react';

/**
 * Partitioner page component - main workspace for quantum circuit partitioning
 */
function WorkspacePage() {
    return (
        <div className="min-h-screen w-full bg-background">
            <Header
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Workspace' }
                ]}
                externalLinks={[
                    { href: 'mailto:ocswom@inf.elte.hu', icon: Mail, label: 'Email' },
                    { href: 'https://github.com/alfaarizi/qubit', icon: Github, label: 'GitHub' }
                ]}
            />
            <div className="h-[calc(100vh-3.5rem)] px-6 pb-6">
                <SidePanelLayout>
                    <SidePanel title="Gates" icon={Layers} side="left">
                        <GatesPanel/>
                    </SidePanel>
                    <CircuitCanvas/>
                    <SidePanel title="QASM Code" icon={FileCode} side="right">
                        <QasmEditor/>
                    </SidePanel>
                </SidePanelLayout>
            </div>
        </div>
    );
}

export default WorkspacePage;