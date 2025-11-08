import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableTextProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    inputClassName?: string;
    placeholder?: string;
}

export function EditableText({
    value,
    onChange,
    className,
    inputClassName,
    placeholder = 'Enter text...'
}: EditableTextProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleBlur = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== value) {
            onChange(trimmed);
        } else {
            setEditValue(value);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            inputRef.current?.blur();
        } else if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={cn('h-auto py-0 px-1 text-xs', inputClassName)}
                placeholder={placeholder}
            />
        );
    }

    return (
        <span
            onClick={() => setIsEditing(true)}
            className={cn(
                'cursor-pointer hover:bg-muted/50 rounded px-1 transition-colors',
                className
            )}
            title="Click to edit"
        >
            {value || placeholder}
        </span>
    );
}
