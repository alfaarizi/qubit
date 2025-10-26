import type { GateInfo } from "@/features/gates/types.ts";
import type { CircuitInfo } from "@/features/circuit/types.ts";
import { GATE_CONFIG } from "@/features/gates/constants.ts";
import type React from "react";

interface GateIconProps extends React.ComponentPropsWithoutRef<'div'> {
    item: GateInfo | CircuitInfo;
}

export function GateIcon({ item, className, style, ...props }: GateIconProps) {
    const { gateSize, fontFamily, fontWeight, fontStyle, backgroundOpacity, singleQubit } = GATE_CONFIG;

    const isCircuit = 'gates' in item;
    const title = item.symbol;
    const color = item.color;
    const textSize = isCircuit ? 'text-xs' : singleQubit.textSize;

    return (
        <div
            className={`flex items-center justify-center border-2 ${textSize} ${className || ''}`}
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
            <span className={`select-none text-foreground px-1 ${isCircuit ? 'truncate' : ''}`}>{title}</span>
        </div>
    );
}