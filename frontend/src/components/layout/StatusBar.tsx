import { Separator } from '@/components/ui/separator'
import { useProject } from "@/features/project/ProjectContext";
import { useCircuitStateById } from "@/features/circuit/store/CircuitStoreContext";

export function StatusBar() {
    const { activeCircuitId } = useProject();
    const circuitState = useCircuitStateById(activeCircuitId);
    return (
        <div className="flex items-center justify-between h-6 px-4 bg-muted/50 border-t text-xs text-muted-foreground">
            { circuitState && (
                <>
                    <div className="flex items-center gap-3">
                        <span>{circuitState.numQubits} qubits</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span>{circuitState.placedGates.length} gates</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span>Depth: {Math.max(-1, ...circuitState.placedGates.map(g => g.depth) ?? []) + 1}</span>
                    </div>
                    <span>Zoom: {100}%</span>
                </>
            )}
        </div>
    )
}