import type { GateInfo } from "@/features/gates/types.ts";
import type { CircuitTemplate } from "@/features/circuit/types.ts";
import { GATE_CONFIG } from "@/features/gates/constants.ts";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface GateIconProps extends React.ComponentPropsWithoutRef<'div'> {
    item: GateInfo | CircuitTemplate;
}

export function GateIcon({ item, className, style, ...props }: GateIconProps) {
    const { gateSize, fontFamily, fontWeight, fontStyle, backgroundOpacity, singleQubit } = GATE_CONFIG;
    const textRef = useRef<HTMLSpanElement>(null);
    const [fontSize, setFontSize] = useState<number>(1);

    const isCircuit = 'gates' in item;
    const title = item.symbol;
    const color = item.color;

    useEffect(() => {
        if (!textRef.current) return;

        const textElement = textRef.current;
        const textWidth = textElement.scrollWidth;
        const textHeight = textElement.scrollHeight;

        const maxWidth = gateSize * 0.8;
        const maxHeight = gateSize * 0.8;

        const scaleX = maxWidth / textWidth;
        const scaleY = maxHeight / textHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        setFontSize(scale);
    }, [title, gateSize]);

    return (
        <div
            className={`flex items-center justify-center border-2 text-sm ${className || ''}`}
            style={{
                width: gateSize,
                height: gateSize,
                backgroundColor: `${color}${backgroundOpacity}`,
                borderColor: color,
                borderWidth: singleQubit.borderWidth,
                fontFamily,
                fontWeight,
                fontStyle,
                ...style
            }}
            {...props}
        >
            <span
                ref={textRef}
                className={`select-none text-foreground px-1 ${isCircuit ? 'truncate' : ''}`}
                style={{ fontSize: `${fontSize}em` }}
            >
                {title}
            </span>
        </div>
    );
}