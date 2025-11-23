"""test circuit conversion - gate registry validation without squander dependency"""
import pytest
import numpy as np
import sys
from unittest.mock import MagicMock

# Mock squander module before importing convert.py
# This allows tests to run without squander installed on the backend
sys.modules['squander'] = MagicMock()

from app.services.convert import GateRegistry, add_gate, CircuitConverter


@pytest.mark.unit
class TestGateRegistry:
  """test gate registry functionality"""
  def test_gate_registry_has_required_gates(self):
    """test registry includes all required quantum gates"""
    required_gates = {'H', 'X', 'Y', 'Z', 'CNOT', 'SWAP', 'TOFFOLI'}
    for gate in required_gates:
      assert gate in GateRegistry.SQUANDER_GATES

  def test_single_qubit_gates_have_one_qubit(self):
    """test single-qubit gates are configured with num_qubits=1"""
    single_qubit = ['H', 'X', 'Y', 'Z', 'S', 'T']
    for gate in single_qubit:
      spec = GateRegistry.SQUANDER_GATES[gate]
      assert spec.num_qubits == 1

  def test_two_qubit_gates_have_two_qubits(self):
    """test two-qubit gates are configured with num_qubits=2"""
    two_qubit = ['CNOT', 'CX', 'CZ', 'SWAP']
    for gate in two_qubit:
      spec = GateRegistry.SQUANDER_GATES[gate]
      assert spec.num_qubits == 2

  def test_three_qubit_gates_have_three_qubits(self):
    """test three-qubit gates are configured with num_qubits=3"""
    three_qubit = ['TOFFOLI', 'CCX', 'CSWAP']
    for gate in three_qubit:
      spec = GateRegistry.SQUANDER_GATES[gate]
      assert spec.num_qubits == 3

  def test_unsupported_gate_raises_error(self):
    """test that unsupported gate raises ValueError"""
    with pytest.raises(ValueError):
      add_gate(None, "UNSUPPORTED_GATE", [], [], [])

  def test_gate_parameters_match_spec(self):
    """test gate parameters match specification"""
    rx_spec = GateRegistry.SQUANDER_GATES['RX']
    assert len(rx_spec.params) > 0
    assert isinstance(rx_spec.params[0], float)


@pytest.mark.unit
class TestCircuitConverter:
  """test circuit conversion logic"""
  def test_gate_registry_not_empty(self):
    """test gate registry contains gates"""
    assert len(GateRegistry.SQUANDER_GATES) > 20

  def test_all_gates_have_valid_method_names(self):
    """test gate specifications have valid SQUANDER method names"""
    for gate_name, spec in GateRegistry.SQUANDER_GATES.items():
      assert spec.method.startswith('add_')
      assert len(spec.method) > 4

  def test_all_gates_have_positive_qubit_counts(self):
    """test all gates require positive number of qubits"""
    for gate_name, spec in GateRegistry.SQUANDER_GATES.items():
      assert spec.num_qubits > 0
      assert spec.num_qubits <= 3

  def test_parameterized_gates_have_parameters(self):
    """test gates with angles have non-empty parameter lists"""
    parameterized = ['RX', 'RY', 'RZ', 'U1', 'U2', 'U3']
    for gate in parameterized:
      spec = GateRegistry.SQUANDER_GATES[gate]
      assert len(spec.params) > 0

  def test_non_parameterized_gates_no_parameters(self):
    """test basic gates have empty parameter lists"""
    non_parameterized = ['H', 'X', 'Y', 'Z', 'S', 'T', 'CNOT', 'SWAP']
    for gate in non_parameterized:
      spec = GateRegistry.SQUANDER_GATES[gate]
      assert len(spec.params) == 0


@pytest.mark.unit
class TestGateConversion:
  """test gate addition and conversion"""
  def test_cx_gate_mapped_to_cnot(self):
    """test CX gate is properly mapped to CNOT"""
    assert GateRegistry.SQUANDER_GATES['CX'].method == GateRegistry.SQUANDER_GATES['CNOT'].method
    assert GateRegistry.SQUANDER_GATES['CX'].method == 'add_CNOT'

  def test_toffoli_and_ccx_equivalent(self):
    """test TOFFOLI and CCX gates are equivalent"""
    assert GateRegistry.SQUANDER_GATES['TOFFOLI'].method == GateRegistry.SQUANDER_GATES['CCX'].method
    assert GateRegistry.SQUANDER_GATES['TOFFOLI'].num_qubits == 3

  def test_rotation_gates_have_pi_parameters(self):
    """test rotation gates include pi-based parameters"""
    rx_spec = GateRegistry.SQUANDER_GATES['RX']
    ry_spec = GateRegistry.SQUANDER_GATES['RY']
    rz_spec = GateRegistry.SQUANDER_GATES['RZ']
    assert np.isclose(rx_spec.params[0], np.pi/2)
    assert np.isclose(ry_spec.params[0], np.pi/2)
    assert np.isclose(rz_spec.params[0], np.pi/2)

  def test_u_gates_parameters_correct(self):
    """test U gate parameters match specifications"""
    u1 = GateRegistry.SQUANDER_GATES['U1']
    u2 = GateRegistry.SQUANDER_GATES['U2']
    u3 = GateRegistry.SQUANDER_GATES['U3']
    assert len(u1.params) == 1
    assert len(u2.params) == 2
    assert len(u3.params) == 3
