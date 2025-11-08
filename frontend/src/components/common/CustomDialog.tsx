import { X } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

interface CustomDialogProps {
    open: boolean;
    position: { x: number; y: number } | null;
    onClose: () => void;
    title: string;
    children: ReactNode;
    minWidth?: string;
    maxWidth?: string;
}

export function CustomDialog({
    open,
    position,
    onClose,
    title,
    children,
    minWidth = '280px',
    maxWidth = '400px',
}: CustomDialogProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [currentPosition, setCurrentPosition] = useState(position);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open && position) {
            setCurrentPosition(position);
        }
    }, [open, position]);

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

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (dialogRef.current?.contains(target) || target.closest('[data-radix-popper-content-wrapper]')) return;
            onClose();
        };
        const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
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

    if (!open || !currentPosition) return null;

    return (
        <div
            ref={dialogRef}
            className="fixed z-50 bg-popover border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95"
            style={{
                left: `${currentPosition.x}px`,
                top: `${currentPosition.y}px`,
                minWidth,
                maxWidth,
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
            <div className="p-4">{children}</div>
        </div>
    );
}
