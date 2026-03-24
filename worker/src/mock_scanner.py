"""Mock scanner for development on non-Linux platforms."""
import random
import logging
import time

logger = logging.getLogger(__name__)

MOCK_DEVICES = [
    {'macAddress': 'AA:BB:CC:DD:EE:01', 'hostname': 'camera-front', 'ports': [
        {'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'nginx 1.24'},
        {'port': 554, 'protocol': 'tcp', 'service': 'rtsp', 'version': ''},
    ]},
    {'macAddress': 'AA:BB:CC:DD:EE:02', 'hostname': 'sonoff-light-01', 'ports': [
        {'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'Tasmota'},
    ]},
    {'macAddress': 'AA:BB:CC:DD:EE:03', 'hostname': 'nvr-main', 'ports': [
        {'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': ''},
        {'port': 8080, 'protocol': 'tcp', 'service': 'http-proxy', 'version': ''},
        {'port': 554, 'protocol': 'tcp', 'service': 'rtsp', 'version': ''},
    ]},
    {'macAddress': 'AA:BB:CC:DD:EE:04', 'hostname': '', 'ports': [
        {'port': 22, 'protocol': 'tcp', 'service': 'ssh', 'version': 'OpenSSH 9.0'},
    ]},
]


def scan_network(cidr: str, scan_type: str = 'discovery') -> list[dict]:
    """Return mock scan results simulating a real network."""
    logger.info(f"[MOCK] Scanning {cidr} (type: {scan_type})")
    time.sleep(2)  # Simulate scan time

    # Parse base IP from CIDR
    base_ip = cidr.split('/')[0].rsplit('.', 1)[0]

    hosts = []
    for i, device in enumerate(MOCK_DEVICES):
        # Randomly skip some devices to simulate offline
        if random.random() < 0.2:
            continue

        hosts.append({
            'macAddress': device['macAddress'],
            'ipAddress': f"{base_ip}.{100 + i}",
            'hostname': device['hostname'],
            'ports': device['ports'] if scan_type != 'status_check' else [],
        })

    logger.info(f"[MOCK] Found {len(hosts)} hosts")
    return hosts
