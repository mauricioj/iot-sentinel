"""
IoT Sentinel Scanner Worker
Consumes scan jobs from Redis/Bull queue and executes nmap scans.
"""
import json
import time
import logging
import redis
from src.config import REDIS_URL, MOCK_MODE, QUEUE_NAME

if MOCK_MODE:
    from src.mock_scanner import scan_network
else:
    from src.scanner import scan_network

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
)
logger = logging.getLogger('worker')


def get_redis_connection() -> redis.Redis:
    """Create Redis connection from URL."""
    return redis.Redis.from_url(REDIS_URL, decode_responses=True)


def process_job(r: redis.Redis, job_data: dict) -> None:
    """Process a single scan job."""
    job_id = job_data.get('jobId', 'unknown')
    cidr = job_data.get('cidr', '')
    scan_type = job_data.get('type', 'discovery')

    logger.info(f"Processing job {job_id}: {scan_type} on {cidr}")

    try:
        hosts = scan_network(cidr, scan_type)
        result = {'hosts': hosts}
        logger.info(f"Job {job_id} completed: {len(hosts)} hosts found")
        return result
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        raise


def consume_jobs(r: redis.Redis) -> None:
    """
    Consume jobs from Bull queue using BRPOPLPUSH pattern.
    Bull stores jobs as JSON in Redis lists.
    """
    wait_queue = f"{QUEUE_NAME}:wait"
    active_queue = f"{QUEUE_NAME}:active"

    logger.info(f"Listening for jobs on {wait_queue}")

    while True:
        try:
            # Block-pop from wait queue, push to active
            job_redis_id = r.brpoplpush(wait_queue, active_queue, timeout=5)
            if job_redis_id is None:
                continue

            # Get the job data
            job_key = f"{QUEUE_NAME}:{job_redis_id}"
            job_raw = r.hget(job_key, 'data')

            if not job_raw:
                logger.warning(f"Job {job_redis_id} has no data, skipping")
                r.lrem(active_queue, 1, job_redis_id)
                continue

            job_data = json.loads(job_raw)
            result = process_job(r, job_data)

            # Store result and mark as completed
            r.hset(job_key, 'returnvalue', json.dumps(result))
            r.hset(job_key, 'finishedOn', str(int(time.time() * 1000)))
            r.lrem(active_queue, 1, job_redis_id)

            # Move to completed set
            completed_key = f"{QUEUE_NAME}:completed"
            r.zadd(completed_key, {job_redis_id: time.time()})

            # Publish completion event for NestJS Bull listener
            r.publish(f"{QUEUE_NAME}:completed", json.dumps({
                'jobId': job_redis_id,
                'returnvalue': result,
            }))

        except redis.ConnectionError:
            logger.error("Redis connection lost, retrying in 5s...")
            time.sleep(5)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            time.sleep(1)


def main():
    mode = "MOCK" if MOCK_MODE else "LIVE"
    logger.info(f"IoT Sentinel Scanner Worker starting ({mode} mode)")

    r = get_redis_connection()
    r.ping()
    logger.info("Connected to Redis")

    consume_jobs(r)


if __name__ == '__main__':
    main()
