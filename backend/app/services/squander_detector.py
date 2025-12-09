import logging
import sys
from typing import Optional

logger = logging.getLogger(__name__)
_squander_available: Optional[bool] = None

def is_squander_available() -> bool:
    """check if SQUANDER is available locally."""
    global _squander_available
    # check once and cache for this process
    if _squander_available is None:
        try:
            # check if already imported
            if 'squander' in sys.modules:
                _squander_available = True
                logger.info("SQUANDER already imported, using local execution")
            else:
                import squander
                _squander_available = True
                logger.info("SQUANDER is available locally, using local execution")
        except ImportError:
            _squander_available = False
            logger.info("SQUANDER not available locally, using remote execution")
    return _squander_available
