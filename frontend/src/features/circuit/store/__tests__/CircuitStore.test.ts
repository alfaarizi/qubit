import { describe, it, expect, beforeEach } from 'vitest'
import { getOrCreateCircuitStore } from '@/features/circuit/store/CircuitStoreContext'
import { CIRCUIT_CONFIG } from '@/features/circuit/constants'
import type { Gate } from '@/features/gates/types'

type CircuitStoreApi = ReturnType<typeof getOrCreateCircuitStore>

describe('CircuitStore', () => {
  let store: CircuitStoreApi
  beforeEach(() => {
    store = getOrCreateCircuitStore('test-circuit-1')
  })
  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = store.getState()
      expect(state.placedGates).toEqual([])
      expect(state.numQubits).toBe(CIRCUIT_CONFIG.defaultNumQubits)
      expect(state.measurements).toHaveLength(CIRCUIT_CONFIG.defaultNumQubits)
      expect(state.isExecuting).toBe(false)
    })
  })
  describe('setPlacedGates', () => {
    it('should set gates', () => {
      const gate: Gate = {
        id: 'gate-1',
        targetQubits: [0],
        controlQubits: [],
        depth: 0,
        children: [],
        parents: [],
        gate: { 
          id: 'H', 
          name: 'Hadamard', 
          symbol: 'H', 
          color: '#0066cc', 
          category: 'single', 
          description: 'Hadamard',
          numControlQubits: 0, 
          numTargetQubits: 1,
        },
      }
      store.setState({ placedGates: [gate] })
      expect(store.getState().placedGates).toContainEqual(gate)
    })
    it('should support function updater', () => {
      const gate1: Gate = {
        id: 'gate-1',
        targetQubits: [0],
        controlQubits: [],
        depth: 0,
        children: [],
        parents: [],
        gate: { 
          id: 'H', 
          name: 'Hadamard', 
          symbol: 'H', 
          color: '#0066cc', 
          category: 'single', 
          description: 'Hadamard',
          numControlQubits: 0, 
          numTargetQubits: 1,
        },
      }
      store.setState({ placedGates: [gate1] })
      const gate2: Gate = {
        id: 'gate-2',
        targetQubits: [1],
        controlQubits: [],
        depth: 0,
        children: [],
        parents: [],
        gate: { id: 'X', 
          
          
          name: 'Pauli-X', 
          symbol: 'X', 
          color: '#ff0000', 
          category: 'single', 
          description: 'Pauli-X',
          numControlQubits: 0, 
          numTargetQubits: 1,
        },
      }
      store.setState((state) => ({
        placedGates: [...state.placedGates, gate2],
      }))
      expect(store.getState().placedGates).toHaveLength(2)
    })
  })
  describe('setNumQubits', () => {
    it('should set number of qubits', () => {
      store.setState({ numQubits: 5 })
      expect(store.getState().numQubits).toBe(5)
    })
    it('should support function updater', () => {
      store.setState({ numQubits: 3 })
      store.setState((state) => ({
        numQubits: state.numQubits + 2,
      }))
      expect(store.getState().numQubits).toBe(5)
    })
  })
  describe('setMeasurements', () => {
    it('should set measurement array', () => {
      const measurements = [true, false, true]
      store.setState({ measurements })
      expect(store.getState().measurements).toEqual(measurements)
    })
  })
  describe('execution', () => {
    it('should set execution status', () => {
      store.setState({ isExecuting: true, executionProgress: 50 })
      expect(store.getState().isExecuting).toBe(true)
      expect(store.getState().executionProgress).toBe(50)
    })
  })
  describe('reset', () => {
    it('should reset to initial state', () => {
      const testGate: Gate = {
        id: 'test',
        targetQubits: [0],
        controlQubits: [],
        depth: 0,
        children: [],
        parents: [],
        gate: { id: 'H', name: 'Hadamard', numControlQubits: 0, numTargetQubits: 1, symbol: 'H', color: '#0066cc', category: 'single', description: 'Hadamard' },
      }
      store.setState({
        numQubits: 10,
        placedGates: [testGate],
        isExecuting: true,
      })
      store.setState({
        placedGates: [],
        numQubits: CIRCUIT_CONFIG.defaultNumQubits,
        measurements: Array(CIRCUIT_CONFIG.defaultNumQubits).fill(true),
        isExecuting: false,
        executionProgress: 0,
        executionStatus: '',
      })
      const state = store.getState()
      expect(state.numQubits).toBe(CIRCUIT_CONFIG.defaultNumQubits)
      expect(state.placedGates).toHaveLength(0)
      expect(state.isExecuting).toBe(false)
    })
  })
})

