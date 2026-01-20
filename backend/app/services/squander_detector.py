import logging
from typing import Optional

logger = logging.getLogger(__name__)

_squander_available: Optional[bool] = None


def is_squander_available() -> bool:
    """Detect if SQUANDER library is installed in the current environment."""
    global _squander_available
    if _squander_available is not None:
        return _squander_available

    try:
        import squander  # noqa: F401
        _squander_available = True
        logger.info("SQUANDER library detected - using local execution")
    except ImportError:
        _squander_available = False
        logger.info("SQUANDER library not found - will use SSH execution")

    return _squander_available
