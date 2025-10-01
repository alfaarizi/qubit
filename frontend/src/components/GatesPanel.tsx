import { useState } from 'react';
import { QUANTUM_GATES, type QuantumGate } from '@/types/gates';

export function GatesPanel() {
    const [draggedGate, setDraggedGate] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, gate: QuantumGate) => {
        // Set the gate data in the drag event
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/json', JSON.stringify(gate));
        setDraggedGate(gate.id);

        // Optional: Create a custom drag image
        const dragImage = e.currentTarget.querySelector('div') as HTMLElement;
        if (dragImage) {
            const clone = dragImage.cloneNode(true) as HTMLElement;
            clone.style.opacity = '0.8';
            document.body.appendChild(clone);
            e.dataTransfer.setDragImage(clone, 24, 24);  // Half of 48px gate size
            setTimeout(() => document.body.removeChild(clone), 0);
        }
    };

    const handleDragEnd = () => {
        setDraggedGate(null);
    };

    return (
        <div className="space-y-4 p-2">
            <div className="text-sm text-muted-foreground mb-4">
                Drag gates to the circuit canvas
            </div>

            <div className="grid grid-cols-4 gap-2">
                {QUANTUM_GATES.map((gate) => (
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
    gate: QuantumGate;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent, gate: QuantumGate) => void;
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
            <div className={`w-12 h-12 flex items-center justify-center border-2 rounded-none
              ${gate.color}
              ${isHovered ? 'shadow-md !border-yellow-400' : 'shadow-sm border-opacity-70'}
            `}
            >
              <span className="text-xl font-bold text-gray-700 select-none">
                {gate.symbol}
              </span>
            </div>
            {isHovered && gate.description && (
                <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1
                    bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap z-50 border
                `}>
                    {gate.description}
                </div>
            )}
        </div>
    );
}