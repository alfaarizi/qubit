import { Separator } from '@/components/ui/separator'
import { useProject } from "@/features/project/ProjectStoreContext";
import { useCircuitStateById } from "@/features/circuit/store/CircuitStoreContext";
import {useEffect, useState} from "react";

export function StatusBar() {
    const { activeCircuitId } = useProject();
    const circuitState = useCircuitStateById(activeCircuitId);

    const [zoom, setZoom] = useState(100)
    useEffect(() => {
        const updateZoom = () => {
            const ratio = window.devicePixelRatio || 1
            setZoom(Math.round(ratio * 100))
        }
        updateZoom()
        window.addEventListener('resize', updateZoom)
        return () => window.removeEventListener('resize', updateZoom)
    }, [])

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
                    <span>Zoom: {zoom}%</span>
                </>
            )}
        </div>
    )
}