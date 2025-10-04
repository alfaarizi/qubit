import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Copy, Check } from 'lucide-react'

export function QasmEditor() {
    const [copied, setCopied] = useState(false)

    const qasm = `OPENQASM 2.0;
include "qelib1.inc";

qreg q[3];
creg c[3];

h q[0];
x q[1];
cx q[0], q[1];

measure q -> c;`

    const handleCopy = async () => {
        await navigator.clipboard.writeText(qasm)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex flex-col h-full gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">QASM Code</h3>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
                <pre className="text-xs font-mono bg-muted/50 p-4 rounded-md">
                    <code>{qasm}</code>
                </pre>
            </ScrollArea>

            <div className="flex gap-4 text-xs text-muted-foreground pt-3 border-t">
                <span>Lines: {qasm.split('\n').length}</span>
                <span>Gates: 3</span>
                <span>Depth: 3</span>
            </div>
        </div>
    )
}