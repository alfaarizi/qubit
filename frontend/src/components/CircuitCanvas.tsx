import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircuitBoard } from "lucide-react";

export function CircuitCanvas() {
    return (
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
    );
}