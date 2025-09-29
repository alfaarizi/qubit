import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidePanelLayout, SidePanel } from '@/components/SidePanelLayout';
import { Layers, FileCode, CircuitBoard } from 'lucide-react';

/**
 * Partitioner page component - main workspace for quantum circuit partitioning
 */
function WorkspacePage() {
    return (
        <div className="min-h-screen w-full bg-background p-6">
            <SidePanelLayout>

                <SidePanel title="Gates" icon={Layers} side="left">
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">Drag gates to circuit</div>
                    </div>
                </SidePanel>

                <Card className="flex-1 flex flex-col border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
                    <CardHeader className="flex flex-row items-center space-y-0 min-h-[2rem]">
                        <div className="flex items-center gap-2">
                            <CircuitBoard className="h-4 w-4" />
                            <CardTitle>Circuit Builder</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <CircuitBoard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <div className="text-lg font-medium mb-2">Quantum Circuit Canvas</div>
                            <div className="text-sm">Drag gates from the left panel to build your circuit</div>
                        </div>
                    </CardContent>
                </Card>

                <SidePanel title="QASM Code" icon={FileCode} side="right">
                    <div className="font-mono text-sm bg-muted/30 p-3 rounded-md">
                        <div className="text-blue-400">OPENQASM 3.0;</div>
                        <div className="text-purple-400">include <span className="text-green-400">"stdgates.inc"</span>;</div>
                        <div className="text-orange-400">qubit q[2];</div>
                        <div className="text-muted-foreground mt-2">// Circuit code will appear here</div>
                    </div>
                </SidePanel>

            </SidePanelLayout>
        </div>
    );
}

export default WorkspacePage;