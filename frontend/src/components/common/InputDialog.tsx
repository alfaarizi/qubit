import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface InputDialogProps {
    open: boolean;
    position: { x: number; y: number } | null;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
}

export function InputDialog({
    open,
    position,
    onClose,
    onConfirm,
    title,
    placeholder = 'Enter value...',
    defaultValue = '',
    confirmText = 'Confirm',
}: InputDialogProps) {
    const [value, setValue] = useState(defaultValue);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [currentPosition, setCurrentPosition] = useState(position);
    const dialogRef = useRef<HTMLDivElement>(null);

    // Reset value and position when opened
    useEffect(() => {
        if (open && position) {
            setValue(defaultValue);
            setCurrentPosition(position);
        }
    }, [open, position, defaultValue]);

    // Handle dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            setCurrentPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y,
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    // Handle click outside and escape key
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!dialogRef.current) return;
        const rect = dialogRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        setIsDragging(true);
    }, []);

    const handleConfirm = useCallback(() => {
        const trimmedValue = value.trim();
        if (trimmedValue) {
            onConfirm(trimmedValue);
            onClose();
        }
    }, [value, onConfirm, onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    }, [handleConfirm]);

    if (!open || !currentPosition) return null;

    return (
        <div
            ref={dialogRef}
            className="fixed z-50 min-w-[280px] max-w-[400px] bg-popover border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95"
            style={{
                left: `${currentPosition.x}px`,
                top: `${currentPosition.y}px`,
            }}
        >
            <div
                className="flex items-center justify-between px-4 py-3 border-b cursor-move select-none"
                onMouseDown={handleMouseDown}
            >
                <h3 className="text-sm font-semibold">{title}</h3>
                <button
                    onClick={onClose}
                    className="h-6 w-6 rounded-sm opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-accent"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="p-4 space-y-3">
                <Input
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleConfirm} disabled={!value.trim()}>
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
