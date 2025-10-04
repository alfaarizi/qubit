import { Header } from "@/components/layout/Header";
import { GatesPanel } from "@/features/gates/components/GatesPanel";
import { CircuitCanvas } from "@/features/circuit/components/CircuitCanvas";
import { QasmEditor } from "@/features/inspector/components/QasmEditor";
import { Layers, FileCode, Github, Mail } from 'lucide-react';
import { Layout } from "@/components/layout/Layout.tsx";
import {ThreeColumnLayout} from "@/components/layout/ThreeColumnLayout.tsx";
import {StatusBar} from "@/components/layout/StatusBar.tsx";
import {Sidebar} from "@/components/layout/Sidebar.tsx";

/**
 * Partitioner page component - main workspace for quantum circuit partitioning
 */
function WorkspacePage() {
    return (
        <Layout>
            <Layout.Header>
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
            </Layout.Header>
            <Layout.Content>
                <ThreeColumnLayout>
                    <ThreeColumnLayout.Left>
                        <Sidebar title="Gates" icon={Layers} side="left">
                        <GatesPanel/>
                        </Sidebar>
                    </ThreeColumnLayout.Left>
                    <ThreeColumnLayout.Center>
                        <CircuitCanvas />
                    </ThreeColumnLayout.Center>
                    <ThreeColumnLayout.Right>
                        <Sidebar title="Inspector" icon={FileCode} side="right">
                            <QasmEditor/>
                        </Sidebar>
                    </ThreeColumnLayout.Right>
                </ThreeColumnLayout>
            </Layout.Content>
            <Layout.Footer>
                <StatusBar/>
            </Layout.Footer>
        </Layout>
    );
}

export default WorkspacePage;