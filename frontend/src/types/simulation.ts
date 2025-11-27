// gate within a partition block
export interface PartitionGate {
  id: string;
  name: string;
  target_qubits: number[];
  control_qubits: number[];
}

// single partition block in circuit decomposition
export interface Partition {
  index: number;
  num_gates: number;
  qubits: number[];
  num_qubits: number;
  gates: PartitionGate[];
}

// metadata about circuit partitioning strategy and results
export interface PartitionInfo {
  strategy: string;
  max_partition_size: number;
  total_partitions: number;
  partitions: Partition[];
}

// complex matrix representation with real and imaginary components
export interface DensityMatrix {
  real: number[][] | null;
  imag: number[][] | null;
}

// entropy data for subsystem size analysis
export interface EntropyScaling {
  subsystem_size: number;
  entropy: number;
}

// quantum state representation with various measurement outputs
export interface QuantumState {
  state_vector?: number[][];
  probabilities?: number[];
  counts?: Record<string, number>;
  density_matrix?: DensityMatrix;
  entropy_scaling?: EntropyScaling[];
  unitary?: number[][] | null;
}

// comparison metrics between original and partitioned simulations
export interface SimulationComparison {
  fidelity?: number;
  probability_difference?: number[];
  max_difference?: number;
}

// error information from simulation execution
export interface SimulationError {
  stage: string;
  error: string;
  timeout?: boolean;
}

// complete simulation results including states and comparison data
export interface SimulationResults {
  num_qubits?: number;
  num_shots?: number;
  circuit_name?: string;
  errors?: SimulationError[];
  partition_info?: PartitionInfo;
  original?: QuantumState;
  partitioned?: QuantumState;
  comparison?: SimulationComparison;
  timestamp?: number;
}