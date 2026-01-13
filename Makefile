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
# Development (Local)
# =========================
dev-install: ## Install dependencies
	yarn install

dev-start: ## Start backend in dev mode
	yarn workspace backend start:dev

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

clean-all: clean docker-clean ## Clean everything including Docker
	@echo "Cleaned all artifacts and Docker resources"
