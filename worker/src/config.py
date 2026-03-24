import os

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
MOCK_MODE = os.getenv('SCANNER_MOCK_MODE', 'false').lower() == 'true'
QUEUE_NAME = 'bull:scanner'
