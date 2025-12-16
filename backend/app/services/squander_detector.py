import sys
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def is_squander_available() -> bool:
    """detect if SQUANDER is available locally via settings or import"""
    # prefer explicit configuration
    if settings.SQUANDER_AVAILABLE == '1':
        logger.info("squander available via settings")
        return True
    # fallback to import detection
    if 'squander' in sys.modules:
        logger.info("squander available via sys.modules")
        return True
    try:
        import squander
        logger.info("squander available via import")
        return True
    except ImportError:
        logger.info("squander not available")
        return False
