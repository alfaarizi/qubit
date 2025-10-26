import { useState, useRef, useEffect } from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Package } from "lucide-react";
import { CreateCircuitDialog } from "@/components/common/CreateCircuitDialog";
import { useCircuitStore } from "@/features/circuit/store/CircuitStoreContext";
import { useCircuitTemplates } from "@/features/circuit/store/CircuitTemplatesStore";

interface SelectionContextMenuProps {
    children: React.ReactNode;
    selectedGateIds: Set<string>;
    onPreventClearSelection: React.Dispatch<React.SetStateAction<boolean>>;
    onClearSelection: () => void;
}

interface DialogState {
    gateIds: Set<string>;
    position: { x: number; y: number };
}

export function SelectionContextMenu({
    children,
    selectedGateIds,
    onPreventClearSelection,
    onClearSelection,
}: SelectionContextMenuProps) {
    const [contextMenuOpen, setIsMenuOpen] = useState(false);
    const [dialogState, setDialogState] = useState<DialogState | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const setPlacedGateIdsRef = useRef<Set<string>>(new Set());

    const placedGates = useCircuitStore((state) => state.placedGates);
    const { addCircuit } = useCircuitTemplates();

    // update preventClearSelection whenever menu or dialog state changes
    useEffect(() => {
        onPreventClearSelection(contextMenuOpen || !!dialogState);
    }, [contextMenuOpen, dialogState, onPreventClearSelection]);

    const handleContextMenuOpen = (open: boolean) => {
        setIsMenuOpen(open);
        if (open && selectedGateIds.size > 0) {
            setPlacedGateIdsRef.current = new Set(selectedGateIds);
        }
    };

    const handleContextMenuItemPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        const position = { x: e.clientX, y: e.clientY };
        setDialogState({ gateIds: setPlacedGateIdsRef.current, position });
    };

    const handleConfirm = (symbol: string, color: string) => {
        if (!dialogState) return;

        const allGates = placedGates
            .filter(item => dialogState.gateIds.has(item.id))
            .flatMap(item => 'circuit' in item
                ? item.circuit.gates.map(g => ({
                    ...g,
                    depth: g.depth + item.depth,
                    targetQubits: g.targetQubits.map(q => q + item.startQubit),
                    controlQubits: g.controlQubits.map(q => q + item.startQubit),
                }))
                : [item]
            );

        if (!allGates.length) {
            setDialogState(null);
            onClearSelection();
            return;
        }

        const minDepth = Math.min(...allGates.map(g => g.depth));
        const minQubit = Math.min(...allGates.flatMap(g => [...g.targetQubits, ...g.controlQubits]));

        addCircuit({
            id: crypto.randomUUID(),
            symbol,
            color,
            gates: allGates.map(g => ({
                ...g,
                depth: g.depth - minDepth,
                targetQubits: g.targetQubits.map(q => q - minQubit),
                controlQubits: g.controlQubits.map(q => q - minQubit),
            })),
        });

        setDialogState(null);
        onClearSelection();
    };

    const handleDialogClose = () => {
        setDialogState(null);
        onClearSelection();
    };

    return (
        <>
            {selectedGateIds.size === 0 ? (
                <>{children}</>
            ) : (
                <ContextMenu modal={false} onOpenChange={handleContextMenuOpen}>
                    <ContextMenuTrigger asChild>
                        {children}
                    </ContextMenuTrigger>
                    <ContextMenuContent 
                        ref={contextMenuRef} 
                        className="w-48"
                    >
                        <ContextMenuItem 
                            onPointerDown={handleContextMenuItemPointerDown}
                            className="gap-2"
                        >
                            <Package className="h-4 w-4" />
                            <span>Create as Circuit</span>
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            )}
            <CreateCircuitDialog
                open={!!dialogState}
                position={dialogState?.position || null}
                onClose={handleDialogClose}
                onConfirm={handleConfirm}
            />
        </>
    );
}