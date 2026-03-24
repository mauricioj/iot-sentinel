#!/usr/bin/env bash
set -euo pipefail

# IoT Sentinel - Build all Docker images
# Usage: ./scripts/build.sh [tag]

TAG=${1:-latest}
REGISTRY=${DOCKER_REGISTRY:-mauricioj}
PREFIX=iot-sentinel

echo "Building IoT Sentinel images (tag: $TAG)..."

echo ""
echo "==> Building API..."
docker build -t $REGISTRY/$PREFIX-api:$TAG -f api/Dockerfile api/

echo ""
echo "==> Building Frontend..."
docker build -t $REGISTRY/$PREFIX-frontend:$TAG -f frontend/Dockerfile frontend/

echo ""
echo "==> Building Worker..."
docker build -t $REGISTRY/$PREFIX-worker:$TAG -f worker/Dockerfile worker/

echo ""
echo "Done! Images built:"
echo "  - $REGISTRY/$PREFIX-api:$TAG"
echo "  - $REGISTRY/$PREFIX-frontend:$TAG"
echo "  - $REGISTRY/$PREFIX-worker:$TAG"
