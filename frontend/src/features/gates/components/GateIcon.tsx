import type { GateInfo } from "@/features/gates/types.ts";
import { GATE_CONFIG } from "@/features/gates/constants.ts";
import type React from "react";

interface GateIconProps extends React.ComponentPropsWithoutRef<'div'> {
    gate: GateInfo;
}

export function GateIcon({ gate, className, style, ...props }: GateIconProps) {
    const { gateSize, fontFamily, fontWeight, fontStyle, backgroundOpacity, singleQubit } = GATE_CONFIG;

    return (
        <div
            className={`flex items-center justify-center border-2 ${singleQubit.textSize} ${className || ''}`}
            style={{
                width: gateSize,
                height: gateSize,
                backgroundColor: `${gate.color}${backgroundOpacity}`,
                borderColor: gate.color,
                borderWidth: singleQubit.borderWidth,
                fontFamily,
                fontWeight,
                fontStyle,
                ...style
            }}
            {...props}
        >
            <span className="select-none text-foreground">{gate.symbol}</span>
        </div>
    );
}