import React, {useState, useRef, useEffect, useCallback} from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Package, Trash2 } from "lucide-react";
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
        // lookup from accumulator (not placedGates) to get gates with updated DAG relationships after each ejection
        const gates = Array.from(gateIds).reduce((acc, gateId) => {
            const gate = acc.find(g => g.id === gateId);
            return gate ? ejectGate(gate, acc) : acc;
        }, placedGates);
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

        // step 1: find external children, they are gates that depend on selected gates but aren't selected themselves
        const selectedIds = new Set(selectedItems.map(item => item.id));
        const externalChildren = selectedItems.flatMap(item => item.children).filter(id => !selectedIds.has(id));

        // step 2: eject selected items, keeping external children disconnected
        const gates = selectedItems.reduce((acc, item) =>
            ejectGate(item, acc, externalChildren),
            placedGates
        );

        // step 3: create circuit and rebuild internal dag
        const circuit = group(selectedItems, symbol, color);
        circuit.circuit.gates = circuit.circuit.gates.reduce(
            (acc, gate) => injectGate(gate, acc),
            [] as (Gate | Circuit)[]
        );

        // step 4: inject circuit, reconnecting external children
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
                            onPointerDown={handleContextMenuItemPointerDown}
                            className="gap-2"
                        >
                            <Package className="h-4 w-4" />
                            <span>Group</span>
                        </ContextMenuItem>
                        <ContextMenuItem
                            onPointerDown={() => handleDeleteGates(selectedGateIds)}
                            className="gap-2 data-[highlighted]:text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
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