export const GATE_STYLES = {
    singleQubit: {
        size: 42,
        borderWidth: 1,
        borderRadius: 0,
        textSize: 'text-md',
        fontWeight: 'font-bold'
    },
    multiQubit: {
        lineWidth: 2,
        controlDotRadius: 4,
        targetRadius: 16,
        textSize: 'text-sm',
        fontWeight: 'font-bold'
    },
    gateSpacing: 50,
    backgroundOpacity: '40',
    previewOpacity: 0.5
} as const;