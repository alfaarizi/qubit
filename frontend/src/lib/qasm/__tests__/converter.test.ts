import { describe, it, expect } from 'vitest'
import { circuitToQASM, getQASMWithMetadata } from '@/lib/qasm/converter'
import type { Gate } from '@/features/gates/types'

describe('QASM converter', () => {
  describe('circuitToQASM', () => {
    it('should generate valid QASM header', () => {
      const code = circuitToQASM(2, [], [true, true])
      expect(code).toContain('OPENQASM 2.0;')
      expect(code).toContain('include "qelib1.inc";')
      expect(code).toContain('qreg q[2];')
    })
    it('should add classical register only if measurements exist', () => {
      const codeWithMeasure = circuitToQASM(2, [], [true, false])
      expect(codeWithMeasure).toContain('creg c[2];')
      const codeWithoutMeasure = circuitToQASM(2, [], [false, false])
      expect(codeWithoutMeasure).not.toContain('creg')
    })
    it('should convert single-qubit gate', () => {
      const gate: Gate = {
        id: 'h-1',
        targetQubits: [0],
        controlQubits: [],
        depth: 0,
        children: [],
        parents: [],
        gate: { id: 'H', name: 'Hadamard', numQubits: 1, numControlQubits: 0, numTargetQubits: 1, symbol: 'H', color: '#0066cc', category: 'single', description: 'Hadamard' },
      }
      const code = circuitToQASM(1, [gate], [false])
      expect(code).toContain('h q[0];')
    })
    it('should convert two-qubit gate', () => {
      const gate: Gate = {
        id: 'cnot-1',
        targetQubits: [1],
        controlQubits: [0],
        depth: 0,
        children: [],
        parents: [],
        gate: { id: 'CNOT', name: 'CNOT', numQubits: 2, numControlQubits: 1, numTargetQubits: 1, symbol: 'X', color: '#ff6600', category: 'controlled', description: 'CNOT' },
      }
      const code = circuitToQASM(2, [gate], [false, false])
      expect(code).toContain('cx q[0], q[1];')
    })
    it('should add measurements for selected qubits', () => {
      const code = circuitToQASM(3, [], [true, false, true])
      expect(code).toContain('measure q[0] -> c[0];')
      expect(code).not.toContain('measure q[1]')
      expect(code).toContain('measure q[2] -> c[2];')
    })
    it('should sort gates by depth then qubit', () => {
      const gate1: Gate = {
        id: 'gate-1',
        targetQubits: [1],
        controlQubits: [],
        depth: 1,
        children: [],
        parents: [],
        gate: { id: 'H', name: 'Hadamard', numQubits: 1, numControlQubits: 0, numTargetQubits: 1, symbol: 'H', color: '#0066cc', category: 'single', description: 'Hadamard' },
      }
      const gate2: Gate = {
        id: 'gate-2',
        targetQubits: [0],
        controlQubits: [],
        depth: 0,
        children: [],
        parents: [],
        gate: { id: 'X', name: 'Pauli-X', numQubits: 1, numControlQubits: 0, numTargetQubits: 1, symbol: 'X', color: '#ff0000', category: 'single', description: 'Pauli-X' },
      }
      const code = circuitToQASM(2, [gate1, gate2], [false, false])
      const xIndex = code.indexOf('x q[0];')
      const hIndex = code.indexOf('h q[1];')
      expect(xIndex).toBeLessThan(hIndex)
    })
  })
  describe('getQASMWithMetadata', () => {
    it('should return code and metadata', () => {
      const gate: Gate = {
        id: 'h-1',
        targetQubits: [0],
        controlQubits: [],
        depth: 0,
        children: [],
        parents: [],
        gate: { id: 'H', name: 'Hadamard', numQubits: 1, numControlQubits: 0, numTargetQubits: 1, symbol: 'H', color: '#0066cc', category: 'single', description: 'Hadamard' },
      }
      const result = getQASMWithMetadata(1, [gate], [true])
      expect(result.code).toContain('h q[0];')
      expect(result.lines).toBeGreaterThan(0)
      expect(result.gates).toBe(1)
      expect(result.depth).toBe(1)
    })
    it('should calculate correct depth for multiple gates', () => {
      const gates: Gate[] = [
        {
          id: 'gate-1',
          targetQubits: [0],
          controlQubits: [],
          depth: 0,
          children: [],
          parents: [],
          gate: { id: 'H', name: 'Hadamard', numQubits: 1, numControlQubits: 0, numTargetQubits: 1, symbol: 'H', color: '#0066cc', category: 'single', description: 'Hadamard' },
        },
        {
          id: 'gate-2',
          targetQubits: [1],
          controlQubits: [],
          depth: 2,
          children: [],
          parents: [],
          gate: { id: 'X', name: 'Pauli-X', numQubits: 1, numControlQubits: 0, numTargetQubits: 1, symbol: 'X', color: '#ff0000', category: 'single', description: 'Pauli-X' },
        },
      ]
      const result = getQASMWithMetadata(2, gates, [false, false])
      expect(result.gates).toBe(2)
      expect(result.depth).toBe(3)
    })
  })
})

