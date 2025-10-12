import { useEffect } from 'react';

interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            shortcuts.forEach(({ key, ctrl, shift, handler }) => {
                const isCtrlPressed = e.ctrlKey || e.metaKey;
                const isShiftPressed = e.shiftKey;
                if (e.key.toLowerCase() !== key.toLowerCase()) return;
                if (ctrl !== undefined && ctrl !== isCtrlPressed) return;
                if (shift === undefined ? isShiftPressed : shift !== isShiftPressed) return;
                e.preventDefault();
                handler();
            });
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}