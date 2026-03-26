"""Periodic health checker — pings registered Things to update online/offline status."""
import time
import json
import logging
import redis as redis_lib

from src.config import HEALTH_CHECK_INTERVAL, API_INTERNAL_URL, MOCK_MODE

logger = logging.getLogger(__name__)


def _fetch_check_config() -> dict:
    """Fetch networks to check and interval from the API."""
    import requests
    try:
        res = requests.get(
            f"{API_INTERNAL_URL}/api/v1/monitor/networks-to-check",
            timeout=10,
            verify=False,
        )
        if res.status_code == 200:
            return res.json()
        logger.warning(f"Failed to get networks: HTTP {res.status_code} — {res.text[:200]}")
        return {}
    except Exception as e:
        logger.error(f"Failed to reach API: {e}")
        return {}


def run_health_check_loop(r: redis_lib.Redis) -> None:
    """Background loop: periodically check health of registered things."""
    interval = HEALTH_CHECK_INTERVAL
    logger.info(f"Health checker started (initial interval: {interval}s)")

    while True:
        try:
            time.sleep(interval)
            logger.info("Running health check cycle...")

            config = _fetch_check_config()
            networks = config.get('networks', [])

            # Update interval from API settings (dynamic)
            new_interval = config.get('interval', interval)
            if new_interval != interval:
                logger.info(f"Health check interval changed: {interval}s → {new_interval}s")
                interval = new_interval

            if not networks:
                logger.debug("No networks to check")
                continue

            if MOCK_MODE:
                from src.mock_scanner import scan_network
            else:
                from src.scanner import scan_network

            all_hosts = []
            for net in networks:
                cidr = net.get('cidr')
                network_id = net.get('networkId')
                if not cidr:
                    continue
                logger.info(f"Health check scanning {cidr}")
                try:
                    hosts = scan_network(cidr, scan_type='status_check')
                    for h in hosts:
                        h['networkId'] = network_id
                    all_hosts.extend(hosts)
                except Exception as e:
                    logger.error(f"Health check scan failed for {cidr}: {e}")

            r.publish('health:check:completed', json.dumps({
                'hosts': all_hosts,
            }))
            logger.info(f"Health check complete: {len(all_hosts)} hosts found across {len(networks)} networks")

        except redis_lib.ConnectionError:
            logger.error("Redis connection lost in health checker, retrying in 10s...")
            time.sleep(10)
        except Exception as e:
            logger.error(f"Health check error: {e}")
            time.sleep(30)
