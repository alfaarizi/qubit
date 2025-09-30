import { SidePanelLayout, SidePanel } from '@/components/SidePanelLayout';
import {Layers, FileCode, Github, Mail} from 'lucide-react';
import { Header } from "@/components/Header/Header";
import { GatesPanel } from "@/components/GatesPanel";
import { CircuitCanvas } from "@/components/CircuitCanvas";
import { QasmEditor } from "@/components/QasmEditor";

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