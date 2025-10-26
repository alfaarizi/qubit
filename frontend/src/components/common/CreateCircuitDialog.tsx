import { useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomDialog } from './CustomDialog';

interface CreateCircuitDialogProps {
    open: boolean;
    position: { x: number; y: number } | null;
    onClose: () => void;
    onConfirm: (symbol: string, color: string) => void;
}

export function CreateCircuitDialog({
    open,
    position,
    onClose,
    onConfirm,
}: CreateCircuitDialogProps) {
    const [symbol, setSymbol] = useState('');
    const [color, setColor] = useState('#3b82f6');

    const handleColorChange = (newColor: string) => {
        setColor(newColor);
    };

    const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
            setColor(value);
        }
    };

    const handleConfirm = useCallback(() => {
        const trimmedSymbol = symbol.trim();
        if (trimmedSymbol) {
            onConfirm(trimmedSymbol, color);
            setSymbol('');
            setColor('#3b82f6');
            onClose();
        }
    }, [symbol, color, onConfirm, onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    }, [handleConfirm]);

    return (
        <CustomDialog open={open} position={position} onClose={onClose} title="Create Circuit">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                        id="symbol"
                        placeholder="Circuit symbol..."
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className="w-10 h-10 rounded border-2 border-border cursor-pointer"
                                    style={{ backgroundColor: color }}
                                    type="button"
                                />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                                <HexColorPicker color={color} onChange={handleColorChange} />
                            </PopoverContent>
                        </Popover>
                        <Input
                            id="color"
                            placeholder="#3b82f6"
                            value={color}
                            onChange={handleHexInputChange}
                            className="flex-1"
                            maxLength={7}
                        />
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleConfirm} disabled={!symbol.trim()}>
                        Create
                    </Button>
                </div>
            </div>
        </CustomDialog>
    );
}
