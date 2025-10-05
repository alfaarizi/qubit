import { Separator } from '@/components/ui/separator'

export function StatusBar() {
    // TODO: These will come from your circuit state later
    const qubits = 3
    const gates = 5
    const depth = 3
    const zoom = 100

    return (
        <div className="flex items-center justify-between h-6 px-4 bg-muted/50 border-t text-xs text-muted-foreground">
            {/* Left side stats */}
            <div className="flex items-center gap-3">
                <span>{qubits} qubits</span>
                <Separator orientation="vertical" className="h-3" />
                <span>{gates} gates</span>
                <Separator orientation="vertical" className="h-3" />
                <span>Depth: {depth}</span>
            </div>
            {/* Right side */}
            <div>
                <span>Zoom: {zoom}%</span>
            </div>
        </div>
    )
}