#!/usr/bin/env bash
set -euo pipefail

# IoT Sentinel - Push all Docker images to registry
# Usage: ./scripts/push.sh [tag]
# Requires: docker login

TAG=${1:-latest}
REGISTRY=${DOCKER_REGISTRY:-mauricioj}
PREFIX=iot-sentinel

echo "Pushing IoT Sentinel images (tag: $TAG)..."

echo ""
echo "==> Pushing API..."
docker push $REGISTRY/$PREFIX-api:$TAG

echo ""
echo "==> Pushing Frontend..."
docker push $REGISTRY/$PREFIX-frontend:$TAG

echo ""
echo "==> Pushing Worker..."
docker push $REGISTRY/$PREFIX-worker:$TAG

echo ""
echo "Done! Images pushed to $REGISTRY"
