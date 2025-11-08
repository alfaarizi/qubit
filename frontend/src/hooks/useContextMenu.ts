import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
    x: number;
    y: number;
}

interface ContextMenuState<T> {
    data: T;
    position: Position;
}

interface UseContextMenuOptions<T> {
    onConfirm: (data: T, inputValue: string) => void;
}

interface UseContextMenuReturn<T> {
    // context menu state
    contextMenu: ContextMenuState<T> | null;
    contextMenuRef: React.RefObject<HTMLDivElement | null>;
    showContextMenu: (data: T, position: Position) => void;
    hideContextMenu: () => void;
    // dialog state
    dialogState: ContextMenuState<T> | null;
    showDialog: () => void;
    hideDialog: () => void;
    // handlers
    handleConfirm: (inputValue: string) => void;
}

export function useContextMenu<T>({
    onConfirm,
}: UseContextMenuOptions<T>): UseContextMenuReturn<T> {
    const [contextMenu, setContextMenu] = useState<ContextMenuState<T> | null>(null);
    const [dialogState, setDialogState] = useState<ContextMenuState<T> | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Handle click outside and escape to close context menu
    useEffect(() => {
        if (!contextMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setContextMenu(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [contextMenu]);

    const showContextMenu = useCallback((data: T, position: Position) => {
        setContextMenu({ data, position });
    }, []);

    const hideContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const showDialog = useCallback(() => {
        if (!contextMenu) return;
        setDialogState(contextMenu);
        setContextMenu(null);
    }, [contextMenu]);

    const hideDialog = useCallback(() => {
        setDialogState(null);
    }, []);

    const handleConfirm = useCallback((inputValue: string) => {
        if (!dialogState) return;
        onConfirm(dialogState.data, inputValue);
        setDialogState(null);
    }, [dialogState, onConfirm]);

    return {
        contextMenu,
        contextMenuRef,
        showContextMenu,
        hideContextMenu,
        dialogState,
        showDialog,
        hideDialog,
        handleConfirm,
    };
}
