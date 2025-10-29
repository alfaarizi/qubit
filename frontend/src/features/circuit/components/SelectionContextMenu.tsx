import React, {useState, useRef, useEffect, useCallback} from "react";
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
import { useCircuitDAG } from "@/features/circuit/hooks/useCircuitDAG";
import type { Gate } from "@/features/gates/types";
import type { Circuit } from "../types";
import {useKeyboardShortcuts} from "@/hooks/useKeyboardShortcuts.ts";

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
    const setPlacedGates = useCircuitStore((state) => state.setPlacedGates);
    const group = useCircuitStore((state) => state.group);
    const { addCircuit } = useCircuitTemplates();
    const { ejectGate, injectGate } = useCircuitDAG();

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

    const handleDeleteGates = useCallback((gateIds: Set<string>) => {
        const gates = Array.from(gateIds).reduce(
            (acc, gateId) => {
                const gate = placedGates.find(g => g.id === gateId);
                return gate ? ejectGate(gate, acc) : acc;
            },
            placedGates
        );
        setPlacedGates(gates);
        onClearSelection();
    }, [placedGates, ejectGate, setPlacedGates, onClearSelection]);

    const handleDelete = useCallback(() => {
        if (selectedGateIds.size > 0) {
            handleDeleteGates(selectedGateIds);
        }
    }, [selectedGateIds, handleDeleteGates]);

    const handleGroup = (symbol: string, color: string) => {
        if (!dialogState) return;

        const selectedItems = placedGates.filter(item => dialogState.gateIds.has(item.id));
        if (!selectedItems.length) {
            setDialogState(null);
            onClearSelection();
            return;
        }

        const gates = selectedItems.reduce((acc, item) => ejectGate(item, acc), placedGates);
        const circuit = group(selectedItems, symbol, color);

        // Rebuild circuit gates with DAG relationships
        circuit.circuit.gates = circuit.circuit.gates
            .sort((a, b) => a.depth - b.depth)
            .reduce((acc, gate) => injectGate(gate, acc), [] as (Gate | Circuit)[]);

        setPlacedGates(injectGate(circuit, gates));
        addCircuit({
            id: circuit.circuit.id,
            symbol: circuit.circuit.symbol,
            color: circuit.circuit.color,
            gates: circuit.circuit.gates,
        });

        setDialogState(null);
        onClearSelection();
    };

    const handleDialogClose = () => {
        setDialogState(null);
        onClearSelection();
    };

    useKeyboardShortcuts([
        { key: 'Delete', handler: handleDelete },
        { key: 'Backspace', handler: handleDelete },
    ]);

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
                            onClick={() => handleDeleteGates(setPlacedGateIdsRef.current)}
                            onPointerDown={handleContextMenuItemPointerDown}
                            className="gap-2"
                        >
                            <Package className="h-4 w-4" />
                            <span>Group</span>
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            )}
            <CreateCircuitDialog
                open={!!dialogState}
                position={dialogState?.position || null}
                onClose={handleDialogClose}
                onConfirm={handleGroup}
            />
        </>
    );
}