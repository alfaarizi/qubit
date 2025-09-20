from importlib.metadata import version

from .gate import Gate
from .circuit import Circuit
from .interfaces import Operation

__version__ = version("qubitkit")
__all__ = ['Gate', 'Circuit', 'Operation']

def hello():
    print(f"Hello from QubitKit {__version__}!")