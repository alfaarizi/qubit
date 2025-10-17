import { useState, useRef, useEffect } from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Package } from "lucide-react";
import { InputDialog } from "@/components/common/InputDialog";

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

    const handleConfirm = (circuitName: string) => {
        if (!dialogState) return;
        console.log('Creating circuit:', circuitName, 'Gates:', Array.from(dialogState.gateIds));
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
            <InputDialog
                open={!!dialogState}
                position={dialogState?.position || null}
                onClose={handleDialogClose}
                onConfirm={handleConfirm}
                title="Create Circuit"
                placeholder="Circuit name..."
                confirmText="Create"
            />
        </>
    );
}