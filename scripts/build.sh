#!/usr/bin/env bash
set -euo pipefail

# IoT Sentinel - Build all Docker images
# Usage: ./scripts/build.sh [tag]

TAG=${1:-latest}
REGISTRY=${DOCKER_REGISTRY:-iotsentinel}

echo "Building IoT Sentinel images (tag: $TAG)..."

echo ""
echo "==> Building API..."
docker build -t $REGISTRY/api:$TAG -f api/Dockerfile api/

echo ""
echo "==> Building Frontend..."
docker build -t $REGISTRY/frontend:$TAG -f frontend/Dockerfile frontend/

echo ""
echo "==> Building Worker..."
docker build -t $REGISTRY/worker:$TAG -f worker/Dockerfile worker/

echo ""
echo "Done! Images built:"
echo "  - $REGISTRY/api:$TAG"
echo "  - $REGISTRY/frontend:$TAG"
echo "  - $REGISTRY/worker:$TAG"
