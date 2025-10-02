export const CIRCUIT_CONFIG = {
    defaultNumQubits: 3,
    defaultMaxDepth: 10,
    qubitLabelWidth: 50,
    footerHeight: 50
};

export const GATE_STYLES = {
    singleQubit: {
        size: 42,
        borderWidth: 1,
        borderRadius: 0,
        textSize: 'text-md',
        fontWeight: 'font-normal',
        fontFamily: 'serif'
    },
    multiQubit: {
        lineWidth: 1,
        controlDotRadius: 4,
        targetRadius: 16,
        textSize: 'text-sm',
        fontWeight: 'font-normal',
        fontFamily: 'serif'
    },
    gateSpacing: 50,
    backgroundOpacity: '40',
    previewOpacity: 0.5
} as const;