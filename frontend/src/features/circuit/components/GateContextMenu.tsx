import { useState, useEffect, useRef } from "react";
import { Edit } from "lucide-react";
import type { Gate } from "@/features/gates/types";

interface GateContextMenuProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    onEdit: (gate: Gate) => void;
}

export function GateContextMenu({ svgRef, onEdit }: GateContextMenuProps) {
    const [contextMenu, setContectMenu] = useState<{
        gate: Gate;
        position: { x: number; y: number };
    } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const handleContextMenu = (event: Event) => {
            const target = event.target as SVGElement;
            const gateElement = target.closest('[data-gate-id]') as SVGElement & { __data__?: Gate };
            if (!gateElement || !gateElement.__data__) return;

            event.preventDefault();
            const mouseEvent = event as MouseEvent;
            setContectMenu({
                gate: gateElement.__data__,
                position: { x: mouseEvent.clientX, y: mouseEvent.clientY },
            });
        };
        svg.addEventListener('contextmenu', handleContextMenu);
        return () => svg.removeEventListener('contextmenu', handleContextMenu);
    }, [svgRef]);

    useEffect(() => {
        if (!contextMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContectMenu(null);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setContectMenu(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [contextMenu]);

    if (!contextMenu) return null;

    return (
        <div
            ref={contextMenuRef}
            className={`
                fixed z-50 min-w-[8rem] overflow-hidden rounded-md border 
                bg-popover p-1 text-popover-foreground shadow-md 
                animate-in fade-in-2 slide-in-from-left-2 duration-200
            `}
            style={{ left: contextMenu.position.x, top: contextMenu.position.y }}
        >
            <button
                onClick={() => {
                    onEdit(contextMenu.gate);
                    setContectMenu(null);
                }}
                className={`
                    relative flex w-full cursor-default select-none items-center gap-2 rounded-sm 
                    px-2 py-1.5 text-sm outline-none transition-colors 
                    hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground
                `}
            >
                <Edit className="h-4 w-4" />
                <span>Edit Gate</span>
            </button>
        </div>
    );
}
