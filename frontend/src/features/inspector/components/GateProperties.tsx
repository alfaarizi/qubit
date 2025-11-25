import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LaTeX } from "@/components/common/LaTeX";
import { useInspector } from "@/features/inspector/InspectorContext";
import { GateIcon } from "@/features/gates/components/GateIcon";

export function GateProperties() {
    const { hoveredGate } = useInspector();

    if (!hoveredGate) {
        return (
            <div className="flex flex-col min-h-0 gap-3 h-[45vh] overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                    <h3 className="text-md font-semibold flex items-center gap-2">
                        Gate Properties
                    </h3>
                </div>
                <Card className="w-full flex flex-col rounded-none border border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex-1 min-h-0">
                    <CardContent className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-3">
                        <p className="text-xs text-center">
                            Hover over a gate to view its properties
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-0 gap-3 h-[42vh] overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <h3 className="text-md font-semibold flex items-center gap-2">
                    Gate Properties
                </h3>
            </div>
            <Card className="w-full flex flex-col rounded-none border border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex-1 min-h-0">
                <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-3 pb-3">
                    <div className="space-y-2.5">
                        {/* Gate Header */}
                        <div className="flex items-start gap-2">
                            <div className="shrink-0">
                                <GateIcon item={hoveredGate} className="shadow-sm" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-semibold text-xs">{hoveredGate.name}</h3>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                        {hoveredGate.category}
                                    </Badge>
                                </div>
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-[11px] text-muted-foreground flex-1 text-justify">{hoveredGate.description}</p>
                                    <span className="text-[11px] text-foreground/80 whitespace-nowrap shrink-0 pr-2">
                                        T: {hoveredGate.numTargetQubits}, C: {hoveredGate.numControlQubits}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Separator className="my-2" />

                        {/* Long Description */}
                        {hoveredGate.longDescription && (
                            <>
                                <div className="space-y-1.5">
                                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                        Description
                                    </h4>
                                    <p className="text-[11px] text-justify leading-relaxed text-foreground/90">
                                        {hoveredGate.longDescription}
                                    </p>
                                </div>
                                <Separator className="my-2" />
                            </>
                        )}

                        {/* Transformations and Matrix */}
                        {(hoveredGate.formulas || hoveredGate.matrix) && (
                            <div className="grid grid-cols-3 gap-2 items-stretch">
                                {/* Transformations - 1/3 width */}
                                {hoveredGate.formulas && hoveredGate.formulas.length > 0 && (
                                    <div className="flex flex-col space-y-1.5 col-span-1">
                                        <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                                            Transformations
                                        </h4>
                                        <div className="flex-1 p-2 space-y-1 flex flex-col justify-start items-start">
                                            {hoveredGate.formulas.map((formula, i) => (
                                                <div key={i} className="text-xs">
                                                    <LaTeX>{formula}</LaTeX>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Matrix Representation */}
                                {hoveredGate.matrix && (
                                    <div className="flex flex-col space-y-1.5 col-span-2">
                                        <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                                            Matrix
                                        </h4>
                                        <div className="flex-1 space-y-1 flex justify-start items-start overflow-x-auto">
                                            <div className="text-xs">
                                                <LaTeX block>{hoveredGate.matrix}</LaTeX>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
        </div>
    );
}
