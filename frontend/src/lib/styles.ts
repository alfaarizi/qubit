export const CIRCUIT_CONFIG = {
    defaultNumQubits: 3,
    defaultMaxDepth: 10,
    qubitLabelWidth: 50,
    footerHeight: 50
};

export const GATE_STYLES = {
    gateSize: 42,
    gateSpacing: 50,
    backgroundOpacity: 40,
    previewOpacity: 0.5,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontFamily: 'serif',
    singleQubit: {
        textSize: 'text-md',
        borderWidth: 1,
        borderRadius: 0
    },
    multiQubit: {
        textSize: 'text-sm',
        lineWidth: 1,
        targetRadius: 16,
        controlDotRadius: 4
    }
} as const;