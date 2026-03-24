#!/usr/bin/env bash
set -euo pipefail

# IoT Sentinel - Full release: build, tag, and push
# Usage: ./scripts/release.sh <version>
# Example: ./scripts/release.sh 1.0.0

if [ -z "${1:-}" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 1.0.0"
  exit 1
fi

VERSION=$1
REGISTRY=${DOCKER_REGISTRY:-mauricioj}
PREFIX=iot-sentinel

echo "Releasing IoT Sentinel v$VERSION..."

# Build with version tag
./scripts/build.sh $VERSION

# Also tag as latest
docker tag $REGISTRY/$PREFIX-api:$VERSION $REGISTRY/$PREFIX-api:latest
docker tag $REGISTRY/$PREFIX-frontend:$VERSION $REGISTRY/$PREFIX-frontend:latest
docker tag $REGISTRY/$PREFIX-worker:$VERSION $REGISTRY/$PREFIX-worker:latest

# Push both tags
./scripts/push.sh $VERSION
./scripts/push.sh latest

echo ""
echo "Release v$VERSION complete!"
echo ""
echo "Users can install with:"
echo "  curl -O https://raw.githubusercontent.com/mauricioj/iot-sentinel/main/docker-compose.prod.yml"
echo "  docker compose -f docker-compose.prod.yml up -d"
