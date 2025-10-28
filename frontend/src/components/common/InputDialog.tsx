import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomDialog } from './CustomDialog';

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

    return (
        <CustomDialog open={open} position={position} onClose={onClose} title={title}>
            <div className="space-y-3">
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
        </CustomDialog>
    );
}
