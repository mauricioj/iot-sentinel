#!/usr/bin/env bash
set -euo pipefail

# IoT Sentinel - Push all Docker images to registry
# Usage: ./scripts/push.sh [tag]
# Requires: docker login

TAG=${1:-latest}
REGISTRY=${DOCKER_REGISTRY:-mauricioj}

echo "Pushing IoT Sentinel images (tag: $TAG)..."

echo ""
echo "==> Pushing API..."
docker push $REGISTRY/api:$TAG

echo ""
echo "==> Pushing Frontend..."
docker push $REGISTRY/frontend:$TAG

echo ""
echo "==> Pushing Worker..."
docker push $REGISTRY/worker:$TAG

echo ""
echo "Done! Images pushed to $REGISTRY"
