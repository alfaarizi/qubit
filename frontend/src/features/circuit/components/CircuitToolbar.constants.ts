export const PARTITION_BACKENDS = [
    { value: 'squander', label: 'SQUANDER' },
] as const;

export const PARTITION_STRATEGIES = [
    { value: 'kahn', label: 'Kahn', description: 'Fast greedy topological sort', disabled: false },
    { value: 'ilp', label: 'ILP', description: 'Integer linear programming', disabled: false },
    { value: 'ilp-fusion', label: 'ILP Fusion', description: 'ILP with fusion cost', disabled: false },
    { value: 'ilp-fusion-ca', label: 'ILP Fusion CA', description: 'ILP fusion with control awareness', disabled: false },
    { value: 'tdag', label: 'TDAG', description: 'Tree-based DAG partitioning', disabled: false },
    { value: 'gtqcp', label: 'GTQCP', description: 'TDAG with GTQCP variant', disabled: false },
    { value: 'qiskit', label: 'Qiskit', description: 'Qiskit partitioning (Disabled)', disabled: true },
    { value: 'qiskit-fusion', label: 'Qiskit Fusion', description: 'Qiskit with fusion (Disabled)', disabled: true },
    { value: 'bqskit-Quick', label: 'BQSKit Quick', description: 'BQSKit quick partitioner (Disabled)', disabled: true },
    { value: 'bqskit-Scan', label: 'BQSKit Scan', description: 'BQSKit scan partitioner (Disabled)', disabled: true },
    { value: 'bqskit-Greedy', label: 'BQSKit Greedy', description: 'BQSKit greedy partitioner (Disabled)', disabled: true },
    { value: 'bqskit-Cluster', label: 'BQSKit Cluster', description: 'BQSKit cluster partitioner (Disabled)', disabled: true },
] as const;

export const UNSUPPORTED_GATES = ['CRX', 'CRZ', 'CU'] as const;

export const MAX_PARTITION_SIZES = [3, 4, 5] as const;

export const DEFAULT_SIMULATION_OPTIONS = {
    densityMatrix: false,
    entropy: false,
} as const;
