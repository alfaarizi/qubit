declare module 'qasm-ts' {
    export interface AstNode {
        constructor?: {
            name?: string;
        };
    }

    export interface QuantumDeclaration extends AstNode {
        identifier: { name: string };
        size?: { value: number };
    }

    export interface QuantumGateCall extends AstNode {
        quantumGateName?: { name: string };
        qubits?: any[];
        parameters?: any[];
        modifiers?: any[];
    }

    export interface QuantumMeasurement extends AstNode {
        qubit: any;
    }

    export function parseFile(
        filePath: string,
        version?: number,
        verbose?: boolean,
        stringify?: boolean
    ): AstNode[] | string;

    export function parseString(
        qasmCode: string,
        version?: number,
        verbose?: boolean,
        stringify?: boolean
    ): AstNode[] | string;
}
