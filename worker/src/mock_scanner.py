"""
Mock scanner for development on non-Linux platforms (Docker Desktop on Windows/macOS).
Returns realistic fake devices based on the CIDR being scanned.
Auto-activated when real nmap scanning is not available.
"""
import random
import logging
import time
import hashlib

logger = logging.getLogger(__name__)

# Simulated device templates
MOCK_DEVICES = [
    {'hostname': 'gateway',           'ports': [{'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'router admin'}, {'port': 53, 'protocol': 'udp', 'service': 'dns', 'version': ''}]},
    {'hostname': 'camera-front-door', 'ports': [{'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'nginx 1.24'}, {'port': 554, 'protocol': 'tcp', 'service': 'rtsp', 'version': ''}]},
    {'hostname': 'camera-garage',     'ports': [{'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'nginx 1.24'}, {'port': 554, 'protocol': 'tcp', 'service': 'rtsp', 'version': ''}]},
    {'hostname': 'sonoff-light-01',   'ports': [{'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'Tasmota 14.3'}]},
    {'hostname': 'sonoff-light-02',   'ports': [{'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'Tasmota 14.3'}]},
    {'hostname': 'nvr-main',          'ports': [{'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': ''}, {'port': 8080, 'protocol': 'tcp', 'service': 'http-proxy', 'version': ''}, {'port': 554, 'protocol': 'tcp', 'service': 'rtsp', 'version': ''}]},
    {'hostname': 'nas-server',        'ports': [{'port': 22, 'protocol': 'tcp', 'service': 'ssh', 'version': 'OpenSSH 9.0'}, {'port': 443, 'protocol': 'tcp', 'service': 'https', 'version': ''}, {'port': 5000, 'protocol': 'tcp', 'service': 'http', 'version': 'Synology DSM'}]},
    {'hostname': 'printer-office',    'ports': [{'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': ''}, {'port': 631, 'protocol': 'tcp', 'service': 'ipp', 'version': ''}]},
    {'hostname': '',                  'ports': [{'port': 80, 'protocol': 'tcp', 'service': 'http', 'version': 'ESP8266'}]},
    {'hostname': 'plc-industrial',    'ports': [{'port': 502, 'protocol': 'tcp', 'service': 'modbus', 'version': ''}]},
]


def _generate_mac(seed: str) -> str:
    """Generate a deterministic MAC address from a seed string."""
    h = hashlib.md5(seed.encode()).hexdigest()
    return ':'.join(h[i:i+2].upper() for i in range(0, 12, 2))


def scan_network(cidr: str, scan_type: str = 'discovery') -> list[dict]:
    """Return mock scan results simulating a real network."""
    logger.info(f"[MOCK] Scanning {cidr} (type: {scan_type})")
    time.sleep(3)  # Simulate realistic scan time

    base_ip = cidr.split('/')[0].rsplit('.', 1)[0]

    # Use CIDR as seed so same network always returns same devices
    random.seed(hashlib.md5(cidr.encode()).hexdigest())

    hosts = []
    for i, device in enumerate(MOCK_DEVICES):
        # ~15% chance each device is "offline" (not returned)
        if random.random() < 0.15:
            continue

        ip = f"{base_ip}.{1 + i}" if i == 0 else f"{base_ip}.{100 + i}"
        mac = _generate_mac(f"{cidr}-{device['hostname']}-{i}")

        hosts.append({
            'macAddress': mac,
            'ipAddress': ip,
            'hostname': device['hostname'],
            'ports': device['ports'] if scan_type != 'status_check' else [],
        })

    # Reset random seed
    random.seed()

    logger.info(f"[MOCK] Found {len(hosts)} hosts")
    return hosts
