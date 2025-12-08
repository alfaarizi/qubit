import { describe, it, expect } from 'vitest'
import { getInvolvedQubits, getSpanQubits, getMaxDepth, createContiguousQubitArrays } from '@/features/gates/utils'
import type { Gate, GateInfo } from '@/features/gates/types'

describe('gate utilities', () => {
  describe('getInvolvedQubits', () => {
    it('should return sorted qubits for single-qubit gate', () => {
      const gate: Gate = {
        id: 'h-1',
        gate: { id: 'H', name: 'Hadamard', symbol: 'H', color: '#0066cc', category: 'single', description: 'Hadamard', numControlQubits: 0, numTargetQubits: 1 },
        targetQubits: [2],
        controlQubits: [],
        depth: 0,
        children: [],
        parents: [],
      }
      expect(getInvolvedQubits(gate)).toEqual([2])
    })
    it('should return sorted qubits for two-qubit gate', () => {
      const gate: Gate = {
        id: 'cnot-1',
        gate: { id: 'CNOT', name: 'CNOT', symbol: 'X', color: '#ff6600', category: 'controlled', description: 'CNOT', numControlQubits: 1, numTargetQubits: 1 },
        targetQubits: [1],
        controlQubits: [0],
        depth: 0,
        children: [],
        parents: [],
      }
      expect(getInvolvedQubits(gate)).toEqual([0, 1])
    })
    it('should handle unsorted qubit arrays', () => {
      const gate: Gate = {
        id: 'gate-1',
        gate: { id: 'TOFFOLI', name: 'Toffoli', symbol: 'X', color: '#ff6600', category: 'controlled', description: 'Toffoli', numControlQubits: 2, numTargetQubits: 1 },
        targetQubits: [2],
        controlQubits: [3, 1],
        depth: 0,
        children: [],
        parents: [],
      }
      expect(getInvolvedQubits(gate)).toEqual([1, 2, 3])
    })
  })
  describe('getSpanQubits', () => {
    it('should return contiguous span between min and max qubits', () => {
      const gate: Gate = {
        id: 'gate-1',
        gate: {
          id: 'CNOT', name: 'CNOT', symbol: 'X', color: '#ff6600', category: 'controlled', description: 'CNOT', numControlQubits: 1, numTargetQubits: 1 },
        targetQubits: [3],
        controlQubits: [0],
        depth: 0,
        children: [],
        parents: [],
      }
      expect(getSpanQubits(gate)).toEqual([0, 1, 2, 3])
    })
    it('should return single qubit span', () => {
      const gate: Gate = {
        id: 'h-1',
        gate: {
          id: 'H', name: 'Hadamard', symbol: 'H', color: '#0066cc', category: 'single', description: 'Hadamard', numControlQubits: 0, numTargetQubits: 1 },
        targetQubits: [1],
        controlQubits: [],
        depth: 0,
        children: [],
        parents: [],
      }
      expect(getSpanQubits(gate)).toEqual([1])
    })
  })
  describe('getMaxDepth', () => {
    it('should return max depth from multiple gates', () => {
      const gates: Gate[] = [
        {
          id: 'gate-1',
          gate: {
            id: 'H', name: 'Hadamard', symbol: 'H', color: '#0066cc', category: 'single', description: 'Hadamard', numControlQubits: 0, numTargetQubits: 1 },
          targetQubits: [0],
          controlQubits: [],
          depth: 0,
          children: [],
          parents: [],
        },
        {
          id: 'gate-2',
          gate: {
            id: 'X', name: 'Pauli-X', symbol: 'X', color: '#ff6600', category: 'single', description: 'Pauli-X', numControlQubits: 0, numTargetQubits: 1 },
          targetQubits: [1],
          controlQubits: [],
          depth: 2,
          children: [],
          parents: [],
        },
        {
          id: 'gate-3',
          gate: {
            id: 'Z', name: 'Pauli-Z', symbol: 'Z', color: '#6600ff', category: 'single', description: 'Pauli-Z', numControlQubits: 0, numTargetQubits: 1 },
          targetQubits: [2],
          controlQubits: [],
          depth: 1,
          children: [],
          parents: [],
        },
      ]
      expect(getMaxDepth(gates)).toBe(2)
    })
    it('should return 0 for empty gates', () => {
      expect(getMaxDepth([])).toBe(0)
    })
  })
  describe('createContiguousQubitArrays', () => {
    it('should create contiguous qubits for single-qubit gate', () => {
      const gateInfo: GateInfo = {
        id: 'H',
        name: 'H',
        numControlQubits: 0,
        numTargetQubits: 1,
        symbol: 'H',
        color: '#0066cc',
        category: 'single',
        description: 'Hadamard',
      }
      const result = createContiguousQubitArrays(gateInfo, 2)
      expect(result.controlQubits).toEqual([])
      expect(result.targetQubits).toEqual([2])
    })
    it('should create contiguous qubits for two-qubit gate', () => {
      const gateInfo: GateInfo = {
        id: 'CNOT',
        name: 'CNOT',
        numControlQubits: 1,
        numTargetQubits: 1,
        symbol: 'X',
        color: '#ff6600',
        category: 'controlled',
        description: 'CNOT',
      }
      const result = createContiguousQubitArrays(gateInfo, 1)
      expect(result.controlQubits).toEqual([1])
      expect(result.targetQubits).toEqual([2])
    })
    it('should create contiguous qubits for three-qubit gate', () => {
      const gateInfo: GateInfo = {
        id: 'TOFFOLI',
        name: 'TOFFOLI',
        numControlQubits: 2,
        numTargetQubits: 1,
        symbol: 'X',
        color: '#ff6600',
        category: 'controlled',
        description: 'Toffoli',
      }
      const result = createContiguousQubitArrays(gateInfo, 0)
      expect(result.controlQubits).toEqual([0, 1])
      expect(result.targetQubits).toEqual([2])
    })
  })
})

