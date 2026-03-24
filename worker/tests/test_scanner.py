"""Tests for nmap result parsing."""
import pytest
from unittest.mock import MagicMock
from src.scanner import parse_nmap_results
from src.mock_scanner import scan_network as mock_scan


class TestParseNmapResults:
    def test_empty_scan(self):
        nm = MagicMock()
        nm.all_hosts.return_value = []
        result = parse_nmap_results(nm)
        assert result == []

    def test_host_with_ports(self):
        nm = MagicMock()
        nm.all_hosts.return_value = ['192.168.1.100']
        nm.__getitem__ = MagicMock(return_value={
            'addresses': {'mac': 'AA:BB:CC:DD:EE:FF'},
            'hostnames': [{'name': 'camera-01'}],
            'tcp': {
                80: {'state': 'open', 'name': 'http', 'product': 'nginx', 'version': '1.24'},
                554: {'state': 'open', 'name': 'rtsp', 'product': '', 'version': ''},
            },
        })
        nm.__getitem__.return_value.all_protocols = MagicMock(return_value=['tcp'])
        nm.__getitem__.return_value.__getitem__ = lambda self, key: {
            'addresses': {'mac': 'AA:BB:CC:DD:EE:FF'},
            'hostnames': [{'name': 'camera-01'}],
            'tcp': {
                80: {'state': 'open', 'name': 'http', 'product': 'nginx', 'version': '1.24'},
                554: {'state': 'open', 'name': 'rtsp', 'product': '', 'version': ''},
            },
        }.get(key, {})
        nm.__getitem__.return_value.get = lambda key, default=None: {
            'addresses': {'mac': 'AA:BB:CC:DD:EE:FF'},
            'hostnames': [{'name': 'camera-01'}],
        }.get(key, default)

        result = parse_nmap_results(nm)
        assert len(result) == 1
        assert result[0]['macAddress'] == 'AA:BB:CC:DD:EE:FF'
        assert result[0]['hostname'] == 'camera-01'


class TestMockScanner:
    def test_returns_hosts(self):
        result = mock_scan('192.168.1.0/24', 'discovery')
        assert isinstance(result, list)
        assert len(result) > 0

    def test_hosts_have_required_fields(self):
        result = mock_scan('192.168.1.0/24', 'discovery')
        for host in result:
            assert 'macAddress' in host
            assert 'ipAddress' in host
            assert 'hostname' in host
            assert 'ports' in host

    def test_status_check_has_no_ports(self):
        result = mock_scan('192.168.1.0/24', 'status_check')
        for host in result:
            assert host['ports'] == []
