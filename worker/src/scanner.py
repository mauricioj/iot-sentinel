"""Real nmap scanner — requires nmap installed and NET_ADMIN capabilities."""
import nmap
import logging

logger = logging.getLogger(__name__)


def scan_network(cidr: str, scan_type: str = 'discovery') -> list[dict]:
    """
    Run nmap scan on a CIDR range.
    Returns list of discovered hosts with MAC, IP, hostname, ports.
    """
    nm = nmap.PortScanner()

    if scan_type == 'discovery':
        # Service version detection
        logger.info(f"Running discovery scan on {cidr}")
        nm.scan(hosts=cidr, arguments='-sn -sV --max-retries 1 --host-timeout 30s')
    elif scan_type == 'status_check':
        # Ping sweep only
        logger.info(f"Running status check on {cidr}")
        nm.scan(hosts=cidr, arguments='-sn --max-retries 1 --host-timeout 10s')
    elif scan_type == 'deep_scan':
        # Full port scan + OS detection
        logger.info(f"Running deep scan on {cidr}")
        nm.scan(hosts=cidr, arguments='-sV -O --max-retries 2 --host-timeout 60s')
    else:
        raise ValueError(f"Unknown scan type: {scan_type}")

    return parse_nmap_results(nm)


def parse_nmap_results(nm: nmap.PortScanner) -> list[dict]:
    """Parse nmap scan results into a structured format."""
    hosts = []

    for host_ip in nm.all_hosts():
        host_info = nm[host_ip]

        # Extract MAC address
        mac = ''
        if 'mac' in host_info.get('addresses', {}):
            mac = host_info['addresses']['mac']

        # Extract hostname
        hostname = ''
        if host_info.get('hostnames'):
            hostname = host_info['hostnames'][0].get('name', '')

        # Extract ports
        ports = []
        for proto in host_info.all_protocols():
            for port_num in host_info[proto]:
                port_info = host_info[proto][port_num]
                if port_info.get('state') == 'open':
                    ports.append({
                        'port': port_num,
                        'protocol': proto,
                        'service': port_info.get('name', ''),
                        'version': f"{port_info.get('product', '')} {port_info.get('version', '')}".strip(),
                    })

        hosts.append({
            'macAddress': mac,
            'ipAddress': host_ip,
            'hostname': hostname,
            'ports': ports,
        })

    logger.info(f"Scan found {len(hosts)} hosts")
    return hosts
