export function QasmEditor() {
    return (
        <div className="font-mono text-sm bg-muted/30 p-3 rounded-md">
            <div className="text-blue-400">OPENQASM 3.0;</div>
            <div className="text-purple-400">include <span className="text-green-400">"stdgates.inc"</span>;</div>
            <div className="text-orange-400">qubit q[2];</div>
            <div className="text-muted-foreground mt-2">// Circuit code will appear here</div>
        </div>
    );
}