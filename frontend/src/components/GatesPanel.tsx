import React, { useState } from 'react';
import { dragState } from '@/lib/dragState';
import { GATE_STYLES } from '@/lib/styles';
import { GATES, type Gate } from '@/types/gates';

export function GatesPanel() {
    const [draggedGate, setDraggedGate] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, gate: Gate) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(gate));
        setDraggedGate(gate.id);
        dragState.set(gate.id);
    };

    const handleDragEnd = () => {
        setDraggedGate(null);
        dragState.set(null);
    };

    return (
        <div className="space-y-4 p-2">
            <div className="text-sm text-muted-foreground mb-4">
                Drag gates to the circuit canvas
            </div>

            <div className="grid grid-cols-4 gap-2">
                {GATES.map((gate) => (
                    <GateItem
                        key={gate.id}
                        gate={gate}
                        isDragging={draggedGate === gate.id}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    />
                ))}
            </div>
        </div>
    );
}

interface GateItemProps {
    gate: Gate;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, gate: Gate) => void;
    onDragEnd: () => void;
}

function GateItem({ gate, isDragging, onDragStart, onDragEnd }: GateItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, gate)}
            onDragEnd={onDragEnd}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
              relative group cursor-grab active:cursor-grabbing
              transition-all duration-200 ease-out
              ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
            `}
            title={gate.description}
        >
            <div
                className={`flex items-center justify-center border-2 rounded-none ${isHovered ? 'shadow-md' : 'shadow-sm'}`}
                style={{
                    width: GATE_STYLES.singleQubit.size,
                    height: GATE_STYLES.singleQubit.size,
                    backgroundColor: `${gate.color}${GATE_STYLES.backgroundOpacity}`,
                    borderColor: isHovered ? '#eab308' : gate.color,
                    borderWidth: GATE_STYLES.singleQubit.borderWidth
                }}
            >
                <span className={`${GATE_STYLES.singleQubit.textSize} ${GATE_STYLES.singleQubit.fontWeight} select-none text-foreground`}>
                    {gate.symbol}
                </span>
            </div>
            {isHovered && gate.description && (
                <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1
                    bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap z-50 border`}
                >
                    {gate.description}
                </div>
            )}
        </div>
    );
}