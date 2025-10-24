import { useEffect, useState } from "react";
import { Edit, Info } from "lucide-react";
import { EditGateDialog } from "@/components/common/EditGateDialog";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useInspector } from "@/features/inspector/InspectorContext";
import { useCircuitStore } from "@/features/circuit/store/CircuitStoreContext";
import type { Gate } from "@/features/gates/types";

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
    const [gateToEdit, setGateToEdit] = useState<Gate | null>(null);
    
    const numQubits = useCircuitStore(state => state.numQubits);
    const placedGates = useCircuitStore(state => state.placedGates);
    const setPlacedGates = useCircuitStore(state => state.setPlacedGates);
    
    const {
        contextMenu,
        contextMenuRef,
        showContextMenu,
        hideContextMenu,
    } = useContextMenu<Gate>({
        onConfirm: () => {},
    });

    const handleViewInfo = () => {
        if (contextMenu?.data) {
            setHoveredGate(contextMenu.data.gate);
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

    const handleEditConfirm = (controlQubits: number[], targetQubits: number[]) => {
        if (!gateToEdit) return;

        // Update the gate with new qubit assignments
        const updatedGate: Gate = {
            ...gateToEdit,
            controlQubits,
            targetQubits,
        };

        // Update the gates array with the modified gate
        const updatedGates = placedGates.map(g => 
            g.id === gateToEdit.id ? updatedGate : g
        );

        setPlacedGates(updatedGates);
        setEditDialogOpen(false);
        setGateToEdit(null);
    };

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const handleContextMenu = (event: Event) => {
            if (!isEnabled) return;

            const target = event.target as SVGElement;
            const gateElement = target.closest('[data-gate-id]') as SVGElement & { __data__?: Gate };
            if (!gateElement || !gateElement.__data__) return;
            
            event.preventDefault();
            const mouseEvent = event as MouseEvent;
            showContextMenu(gateElement.__data__, {
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
                        className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                        <Info className="h-4 w-4" />
                        <span>View Info</span>
                    </button>
                    <button
                        onClick={handleEditGate}
                        className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                        <Edit className="h-4 w-4" />
                        <span>Edit Gate</span>
                    </button>
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
                onConfirm={handleEditConfirm}
            />
        </>
    );
}
