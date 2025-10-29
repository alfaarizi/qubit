import React, { useEffect, useState } from "react";
import { Edit, Info, PackageOpen, Trash2 } from "lucide-react";
import { EditGateDialog } from "@/components/common/EditGateDialog";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useInspector } from "@/features/inspector/InspectorContext";
import { useCircuitStore } from "@/features/circuit/store/CircuitStoreContext";
import type { Gate } from "@/features/gates/types";
import type { Circuit } from "@/features/circuit/types";
import { useCircuitDAG } from "../hooks/useCircuitDAG";
import {getSpanQubits} from "@/features/gates/utils.ts";

interface GateContextMenuProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    isEnabled?: boolean;
}

export function GateContextMenu({
    svgRef,
    isEnabled = true
}: GateContextMenuProps) {
    const { setHoveredGate } = useInspector();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editDialogPosition, setEditDialogPosition] = useState<{ x: number; y: number } | null>(null);
    const [gateToEdit, setGateToEdit] = useState<Gate | Circuit | null>(null);

    const placedGates = useCircuitStore(state => state.placedGates);
    const setPlacedGates = useCircuitStore(state => state.setPlacedGates);
    const numQubits = useCircuitStore(state => state.numQubits);
    const ungroup = useCircuitStore(state => state.ungroup);
    const { ejectGate, injectGate, getItemWidth } = useCircuitDAG();
    
    const {
        contextMenu,
        contextMenuRef,
        showContextMenu,
        hideContextMenu,
    } = useContextMenu<Gate | Circuit>({
        onConfirm: () => {},
    });
    
    const handleViewInfo = () => {
        if (contextMenu?.data) {
            const gateInfo = 'gate' in contextMenu.data ? contextMenu.data.gate : null;
            if (gateInfo) {
                setHoveredGate(gateInfo);
            }
            hideContextMenu();
        }
    };

    const handleEditGate = () => {
        if (contextMenu?.data) {
            setGateToEdit(contextMenu.data);
            setEditDialogPosition(contextMenu.position);
            setEditDialogOpen(true);
            hideContextMenu();
        }
    };

    const handleDelete = () => {
        if (!contextMenu?.data) return;
        const gates = ejectGate(contextMenu.data, placedGates);
        setPlacedGates(gates);
        hideContextMenu();
    };

    const handleUngroup = () => {
        if (!contextMenu?.data || !('circuit' in contextMenu.data)) return;

        const circuit = contextMenu.data;

        // step 1: ungroup circuit and rebuild internal dag for nested circuits
        const ungroupedGates = ungroup(circuit).map(item => {
            if ('circuit' in item) {
                return {
                    ...item,
                    circuit: {
                        ...item.circuit,
                        gates: item.circuit.gates.reduce(
                            (acc, gate) => injectGate(gate, acc),
                            [] as (Gate | Circuit)[]
                        )
                    }
                };
            }
            return item;
        });

        // step 2: find gates that overlap with circuit's qubits and depth range
        const circuitSpanQubits = new Set(getSpanQubits(circuit));
        const circuitWidth = getItemWidth(circuit);
        const circuitMaxDepth = circuit.depth + circuitWidth;

        const overlappingGates = placedGates
            .filter(gate => {
                if (gate.id === circuit.id) return false;
                const overlapQubits = getSpanQubits(gate).some(q => circuitSpanQubits.has(q));
                return gate.depth >= circuit.depth && gate.depth < circuitMaxDepth && overlapQubits;
            })
            .map(gate => gate.id);

        // step 3: eject circuit, keeping overlapping gates disconnected
        const gates = ejectGate(circuit, placedGates, overlappingGates);

        // step 4: inject ungrouped gates, reconnecting overlapping gates
        setPlacedGates(
            ungroupedGates.reduce((acc, gate) => injectGate(gate, acc), gates)
        );
        hideContextMenu();
    };

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const handleContextMenu = (event: Event) => {
            if (!isEnabled) return;

            const target = event.target as SVGElement;
            const element = target.closest('[data-gate-id]') as SVGElement & { __data__?: Gate | Circuit };
            if (!element || !element.__data__) return;

            event.preventDefault();
            const mouseEvent = event as MouseEvent;
            showContextMenu(element.__data__, {
                x: mouseEvent.clientX,
                y: mouseEvent.clientY,
            });
        };
        svg.addEventListener('contextmenu', handleContextMenu);
        return () => svg.removeEventListener('contextmenu', handleContextMenu);
    }, [svgRef, isEnabled, showContextMenu]);

    return (
        <>
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-2 slide-in-from-left-2 duration-200"
                    style={{ left: contextMenu.position.x, top: contextMenu.position.y }}
                >
                    <button
                        onClick={handleViewInfo}
                        className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                        <Info className="h-4 w-4" />
                        <span>View Info</span>
                    </button>
                    <button
                        onClick={handleEditGate}
                        className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                        <Edit className="h-4 w-4" />
                        <span>{'gate' in contextMenu.data ? 'Edit Gate' : 'Edit Circuit'}</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-destructive focus:bg-accent focus:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete {contextMenu?.data && 'gate' in contextMenu.data ? 'Gate' : 'Circuit'}</span>
                    </button>
                    {'circuit' in contextMenu.data && (
                        <button
                            onClick={handleUngroup}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                            <PackageOpen className="h-4 w-4" />
                            <span>Ungroup</span>
                        </button>
                    )}
                </div>
            )}
            <EditGateDialog
                open={editDialogOpen}
                position={editDialogPosition}
                gate={gateToEdit}
                numQubits={numQubits}
                onClose={() => {
                    setEditDialogOpen(false);
                    setGateToEdit(null);
                }}
            />
        </>
    );
}
