import os
import subprocess
import logging

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
QUEUE_NAME = 'bull:scanner'

def _detect_mock_mode() -> bool:
    """Auto-detect if real scanning is possible.

    Returns True (mock mode) if:
    - SCANNER_MOCK_MODE=true is explicitly set
    - nmap is not installed
    - We're in a Docker VM that can't see the host network (Docker Desktop on Windows/macOS)
    """
    explicit = os.getenv('SCANNER_MOCK_MODE', 'auto').lower()
    if explicit == 'true':
        return True
    if explicit == 'false':
        return False
    # 'auto' or empty — detect automatically

    # Check if nmap is available
    try:
        subprocess.run(['nmap', '--version'], capture_output=True, timeout=5)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        logger.warning('nmap not found — enabling mock mode')
        return True

    # Detect Docker Desktop VM: scan a known-unreachable IP and check if nmap
    # returns suspiciously many hosts (VM ARP issue) or if we're not on Linux
    try:
        result = subprocess.run(
            ['nmap', '-sn', '--max-retries', '0', '--host-timeout', '2s', '192.0.2.1'],
            capture_output=True, text=True, timeout=10,
        )
        # 192.0.2.1 is TEST-NET (RFC 5737) — should never be reachable
        # If nmap says it's "up", we're likely in a broken network context
        if 'Host is up' in result.stdout:
            logger.warning('Network scan unreliable (Docker Desktop VM detected) — enabling mock mode')
            return True
    except (subprocess.TimeoutExpired, Exception):
        pass

    return False

MOCK_MODE = _detect_mock_mode()
