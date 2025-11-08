// serialized gate representation for API communication and persistence
export interface SerializedGate {
  id: string;
  depth: number;
  gate?: {
    name: string;
  };
  circuit?: {
    id: string;
    symbol: string;
    gates: SerializedGate[];
  };
  target_qubits?: number[];
  control_qubits?: number[];
  start_qubit?: number;
  parameters?: number[];
}