import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GateProperties() {
    const gate = {
        name: "Hadamard Gate (H)",
        description: "Creates superposition:",
        formula: ["|0⟩ → (|0⟩ + |1⟩)/√2", "|1⟩ → (|0⟩ - |1⟩)/√2"],
        qubit: "q[0]",
        depth: 1,
        matrix: [
            "1/√2 [ 1   1 ]",
            "      [ 1  -1 ]",
        ],
    };

    return (
        <Card className="w-full flex flex-col border border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <CardHeader>
                <CardTitle className="text-sm font-semibold">Gate Properties</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
                {/* Gate Info */}
                <div className="border border-blue-400 bg-blue-100 rounded p-3 text-blue-900 text-xs">
                    <p className="font-semibold text-blue-800">{gate.name}</p>
                    <p className="mt-1">{gate.description}</p>
                    {gate.formula.map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                    <p className="mt-2">Applied to: {gate.qubit}</p>
                    <p>Gate depth: {gate.depth}</p>
                </div>

                {/* Matrix */}
                <div>
                    <p className="text-xs font-medium mt-2">Matrix:</p>
                    <pre className="rounded-md p-2 text-xs font-mono">{gate.matrix.join("\n")}</pre>
                </div>
            </CardContent>
        </Card>
    );
}
