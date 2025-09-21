from .gate import Gate
from .circuit import Circuit
from .interfaces import Operation

try:
    from importlib.metadata import version
    __version__ = version("qubitkit")
except Exception:
    __version__ = "unknown"

__all__ = ['Gate', 'Circuit', 'Operation']

def hello():
    print(f"Hello from QubitKit {__version__}!")