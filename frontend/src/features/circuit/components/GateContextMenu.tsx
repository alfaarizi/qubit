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
    const { ejectGate, injectGate } = useCircuitDAG();
    
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

        // step 1: get ungrouped gates and rebuild internal DAGs for nested circuits
        const ungroupedGates = ungroup(circuit).map(item => {
            if ('circuit' in item) {
                // Rebuild internal DAG for nested circuits
                return {
                    ...item,
                    circuit: {
                        ...item.circuit,
                        gates: item.circuit.gates
                            .map(g => ({
                                ...g,
                                parents: [],
                                children: []
                            }))
                            .sort((a, b) => a.depth - b.depth)
                            .reduce((acc, gate) => injectGate(gate, acc), [] as (Gate | Circuit)[])
                    }
                };
            }
            return item;
        });

        // step 2: identify gates that need reconnection
        const circuitSpanQubits = new Set(getSpanQubits(circuit));
        const affectedGateIds = new Set<string>();
        const placedGatesMap = new Map(placedGates.map(g => [g.id, g]));

        // first pass: mark circuit
        affectedGateIds.add(circuit.id);

        // second pass: mark all parents and children recursively
        const markChildren = (gateId: string) => {
            const gate = placedGatesMap.get(gateId);
            if (!gate) return;
            gate.children.forEach(childId => {
                if (!affectedGateIds.has(childId)) {
                    affectedGateIds.add(childId);
                    markChildren(childId);
                }
            });
        };
        affectedGateIds.forEach(id => markChildren(id));

        // step 3: partition gates into unaffected and affected regions
        const [unaffectedGates, affectedGates] = placedGates.reduce(
            ([unaffected, affected], g) => {
                return affectedGateIds.has(g.id)
                    ? [unaffected, [...affected, g]]
                    : [[...unaffected, g], affected];
            },
            [[], []] as [(Gate | Circuit)[], (Gate | Circuit)[]]
        );

        // step 4: rebuild affected gates
        const reconnectedGates = [
            ...affectedGates.filter(g => g.id !== circuit.id), // remove the circuit
            ...ungroupedGates
        ]
            .map(g => ({
                ...g,
                parents: [],
                children: []
            }))
            .sort((a, b) => a.depth - b.depth)
            .reduce((acc, gate) => injectGate(gate, acc), unaffectedGates);

        setPlacedGates(reconnectedGates);
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
