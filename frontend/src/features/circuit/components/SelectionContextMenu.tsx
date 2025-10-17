import { useState, useRef } from "react";
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
}

interface DialogState {
    gateIds: Set<string>;
    position: { x: number; y: number };
}

export function SelectionContextMenu({ 
    children, 
    selectedGateIds, 
}: SelectionContextMenuProps) {
    const menuContentRef = useRef<HTMLDivElement>(null);
    const [dialogState, setDialogState] = useState<DialogState | null>(null);
    const capturedGatesRef = useRef<Set<string>>(new Set());

    const handleContextMenuOpen = (open: boolean) => {
        if (open && selectedGateIds.size > 0) {
            capturedGatesRef.current = new Set(selectedGateIds);
        }
    };

    const showDialog = () => {
        const rect = menuContentRef.current?.getBoundingClientRect();
        const position = rect 
            ? { x: rect.right + 10, y: rect.top }
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        setDialogState({ gateIds: capturedGatesRef.current, position });
    };

    const handleConfirm = (circuitName: string) => {
        if (!dialogState) return;
        console.log('Creating circuit:', circuitName, 'Gates:', Array.from(dialogState.gateIds));
        // TODO: Implement circuit creation logic
        setDialogState(null);
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
                    <ContextMenuContent ref={menuContentRef} className="w-48">
                        <ContextMenuItem 
                            onSelect={(e) => {
                                e.preventDefault();
                                showDialog();
                            }}
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
                onClose={() => setDialogState(null)}
                onConfirm={handleConfirm}
                title="Create Circuit"
                placeholder="Circuit name..."
                confirmText="Create"
            />
        </>
    );
}