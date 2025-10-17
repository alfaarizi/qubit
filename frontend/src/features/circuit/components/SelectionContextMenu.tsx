import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Package } from "lucide-react";

interface SelectionContextMenuProps {
    children: React.ReactNode;
    selectedGateIds: Set<string>;
    onCreateCircuit: (gateIds: Set<string>) => void;
}

export function SelectionContextMenu({ 
    children, 
    selectedGateIds, 
    onCreateCircuit
}: SelectionContextMenuProps) {
    return (
        <ContextMenu modal={false}>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuItem 
                    onClick={() => onCreateCircuit(selectedGateIds)}
                    disabled={selectedGateIds.size <= 0}
                    className="gap-2"
                >
                    <Package className="h-4 w-4" />
                    <span>Create as Circuit</span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
