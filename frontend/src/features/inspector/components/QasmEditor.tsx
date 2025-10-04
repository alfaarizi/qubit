import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Copy, Check } from 'lucide-react'

export function QasmEditor() {
    const [copied, setCopied] = useState(false)

    // TODO: This will come from your circuit state later
    const qasm = `OPENQASM 2.0;
include "qelib1.inc";

// Quantum registers
qreg q[3];
creg c[3];

// Circuit operations
h q[0];
x q[1];
cx q[0], q[1];

// Measurements
measure q -> c;`

    const handleCopy = async () => {
        await navigator.clipboard.writeText(qasm)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with Copy Button */}
            <div className="flex items-center justify-between pb-3 border-b mb-3">
                <h3 className="text-sm font-semibold">QASM Code</h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                >
                    {copied ? (
                        <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                        </>
                    )}
                </Button>
            </div>

            {/* Code Display */}
            <ScrollArea className="flex-1">
        <pre className="text-xs font-mono bg-muted/50 p-4 rounded-md">
          <code>{qasm}</code>
        </pre>
            </ScrollArea>

            {/* Stats Footer */}
            <div className="pt-3 border-t mt-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Lines: {qasm.split('\n').length}</span>
                    <span>Gates: 3</span>
                    <span>Depth: 3</span>
                </div>
            </div>
        </div>
    )
}