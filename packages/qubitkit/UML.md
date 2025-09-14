@startuml Qubitkit

!theme plain
skinparam classAttributeIconSize 0
skinparam classFontStyle bold
skinparam packageStyle rect

package "Circuit Model" {
    enum GateType {
        SINGLE_QUBIT,
        TWO_QUBIT,
        MEASUREMENT,
        CUSTOM
    }
    
    class Gate {
        - gate_name: string
        - gate_type: GateType
        - target_qubits: int[]
        - control_qubits: int[]
        - parameters: Map<string, Object>
        - parents: Gate[]
        - children: Gate[]
        - partition_id: int
        - source_library: string
        --
        + Gate(name: string, targets: int[], controls: int[], params: Map<string, Object>)
        + get_name(): string
        + get_type(): GateType
        + get_targets(): int[]
        + get_controls(): int[]
        + get_parameters(): Map<string, Object>
        + get_parents(): Gate[]
        + get_children(): Gate[]
        + get_partition_id(): int
        + set_partition_id(partition_id: int): void
        + get_qubit_count(): int
        + to_string(): string
    }
    
    class Circuit extends Gate {
        - gates: Gate[]
        - num_qubits: int
        - metadata: Map<string, Object>
        - dependencies_dirty: boolean
        --
        + Circuit(num_qubits: int, name: string, source: string)
        + get_gates(): Gate[]
        + get_gate_count(): int
        + get_depth(): int
        + get_num_qubits: int
        + get_metadata(): Map<string, Object>
        + add_gate(gate: Gate): void
        + get_parents(gate: Gate): int[]
        + get_children(gate: Gate): int[]
        + ensure_dependencies(): void
        + flatten(): Circuit
        + clone(): Circuit
    }
    
    class PartitionedCircuit {
        - original_circuit: Circuit
        - partitions: Gate[]
        - max_qubits: int
        - metadata: Map<string, Object>
        - method: string
        - source_library: string
        --
        + PartitionedCircuit(original_circuit: Circuit, partitions: Gate[], method: string, source_library: string)
        + get_original_circuit(): Circuit
        + get_partitions(): Gate[]
        + get_flat_partitions(): List<List<Gate>>
        + get_partition_count(): int
        + get_max_qubits(): int
        + get_metadata(): Map<string, Object>
        + get_method(): string
        + get_source_library(): string
        + flatten(): Circuit
        + clone(): Circuit
    }
    
    class Utils<<utility>> {
        + {static} partition(input: Circuit, method: string, max_qubits: int): PartitionedCircuit
        + {static} partition(input: PartitionedCircuit, method: string, max_qubits: int): PartitionedCircuit
    }
    
    Gate --> GateType : uses
    Circuit o-- Gate : contains
    PartitionedCircuit --> Circuit : stores
    PartitionedCircuit o-- Gate : contains
    Utils ..> Circuit : uses
    Utils ..> PartitionedCircuit : creates
    
}

package "Library Adapters" {
    class CircuitAdapterFactory {
        - adapters: Map<string, CircuitAdapter>
        --
        + register_adapter(library: string, adapter: CircuitAdapter): void
        + get_adapter(library: string): CircuitAdapter
        + detect_adapter(circuit: Object): CircuitAdapter
        + get_supported_libraries(): string[]
        + is_supported(library: string): boolean
    }
    
    interface CircuitAdapter {
        + import_circuit(external: Object): Circuit
        + export_circuit(internal: Circuit): Object
        + get_library_name(): string
        + can_convert(circuit: Object): boolean
        + get_gate_mapping(): Map<string, string>
    }
    
    class SquanderAdapter implements CircuitAdapter {
        - gate_type_mapping: Map<string, GateType>
        - parameter_mapping: Map<string, string>
        --
        + import_circuit(squander_circuit: Object): Circuit
        + export_circuit(circuit: Circuit): Object
        + get_library_name(): string
        + can_convert(circuit: Object): boolean
        + get_gate_mapping(): Map<string, string>
        - map_gate_type(squander_type: string): GateType
        - extract_dependencies(squander_circuit: Object): void
    }
    
    class QiskitAdapter implements CircuitAdapter {
        --
        + import_circuit(qiskit_circuit: Object): Circuit
        + export_circuit(circuit: Circuit): Object
        + get_library_name(): string
        + can_convert(circuit: Object): boolean
        + get_gate_mapping(): Map<string, string>
        - handle_qiskit_barriers(qc: Object): void
        - convert_classical_bits(qc: Object): void
    }
    
    class BqskitAdapter implements CircuitAdapter {
        --
        + import_circuit(bqskit_circuit: Object): Circuit
        + export_circuit(circuit: Circuit): Object
        + get_library_name(): string
        + can_convert(circuit: Object): boolean
        + get_gate_mapping(): Map<string, string>
        - handle_variable_gates(circuit: Object): void
    }
    
    CircuitAdapter --o CircuitAdapterFactory : manages
}

@enduml
