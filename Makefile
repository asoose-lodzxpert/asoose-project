# ASOOSE Project Makefile (Backend Only)
.PHONY: help docker-build docker-run docker-stop docker-logs docker-clean docker-push db-migrate db-seed db-studio clean clean-all

# =========================
# Variables
# =========================
IMAGE_NAME = devenochphilip/asoose-backend
IMAGE_TAG = latest
CONTAINER_NAME = asoose-backend

DOCKERFILE = backend/Dockerfile
ENV_FILE = backend/.env

# Redis (Development only)
REDIS_IMAGE = redis:7-alpine
REDIS_CONTAINER = asoose-redis-dev
REDIS_PORT = 6379

# =========================
# Help
# =========================
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# =========================
# Docker Commands
# =========================
docker-build: ## Build Docker image
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) -f $(DOCKERFILE) .

docker-run: ## Run backend using .env file
	docker run -d --name $(CONTAINER_NAME) \
		--env-file $(ENV_FILE) \
		-p 3000:3000 \
		$(IMAGE_NAME):$(IMAGE_TAG)
	@echo "Backend started at http://localhost:3000"

docker-stop: ## Stop and remove backend container
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true

docker-logs: ## View backend logs
	docker logs -f $(CONTAINER_NAME)

docker-clean: ## Remove image and container
	docker rm -f $(CONTAINER_NAME) || true
	docker rmi $(IMAGE_NAME):$(IMAGE_TAG) || true
	docker system prune -f

# =========================
# Docker Hub Push
# =========================
docker-login: ## Login to Docker Hub
	docker login

docker-push: docker-build docker-login ## Build and push to Docker Hub
	docker push $(IMAGE_NAME):$(IMAGE_TAG)
	@echo "Image pushed to Docker Hub: $(IMAGE_NAME):$(IMAGE_TAG)"

# =========================
# Prisma Commands (inside container)
# =========================
db-migrate: ## Run Prisma migrations
	docker exec -it $(CONTAINER_NAME) yarn prisma migrate deploy

db-seed: ## Seed database
	docker exec -it $(CONTAINER_NAME) yarn seed

db-studio: ## Open Prisma Studio
	docker exec -it $(CONTAINER_NAME) yarn prisma studio

# =========================
# Redis (Development Only)
# =========================
redis-run: ## Start Redis container for development
	docker run -d --name $(REDIS_CONTAINER) \
		-p $(REDIS_PORT):6379 \
		$(REDIS_IMAGE)
	@echo "Redis started at localhost:$(REDIS_PORT)"

redis-stop: ## Stop Redis container
	docker stop $(REDIS_CONTAINER) || true
	docker rm $(REDIS_CONTAINER) || true

redis-logs: ## View Redis logs
	docker logs -f $(REDIS_CONTAINER)

redis-clean: ## Remove Redis container
	docker rm -f $(REDIS_CONTAINER) || true

# =========================
# Development (Local)
# =========================
dev-install: ## Install dependencies
	yarn install

dev-start: ## Start backend in dev mode
	yarn workspace backend start:dev

dev-full: redis-run ## Start Redis and backend for development
	@echo "Starting full development environment..."
	@sleep 2
	yarn workspace backend start:dev

dev-stop: redis-stop ## Stop all development services
	@echo "Development services stopped"

# =========================
# Testing
# =========================
test: ## Run tests
	yarn workspace backend test

test-e2e: ## Run e2e tests
	yarn workspace backend test:e2e

# =========================
# Cleanup
# =========================
clean: ## Clean build artifacts
	rm -rf node_modules
	rm -rf backend/dist
	rm -rf backend/node_modules
	find . -name "*.log" -delete

clean-all: clean docker-clean redis-clean ## Clean everything including Docker
	@echo "Cleaned all artifacts and Docker resources"
