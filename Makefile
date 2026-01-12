# ASOOSE Project Makefile
.PHONY: help docker-build docker-up docker-down k8s-deploy k8s-delete clean

# Variables
DOCKER_COMPOSE = docker-compose
KUBECTL = kubectl
AWS_REGION = us-east-1
ECR_REPO = asoose-backend
NAMESPACE = asoose

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Docker Commands
docker-build: ## Build Docker image
	docker build -t $(ECR_REPO):latest -f backend/Dockerfile .

docker-up: ## Start Docker Compose services
	$(DOCKER_COMPOSE) up -d
	@echo "Services started. Access backend at http://localhost:3000"

docker-down: ## Stop Docker Compose services
	$(DOCKER_COMPOSE) down

docker-logs: ## View Docker Compose logs
	$(DOCKER_COMPOSE) logs -f

docker-clean: ## Remove Docker containers and volumes
	$(DOCKER_COMPOSE) down -v
	docker system prune -f

# Database Commands
db-migrate: ## Run database migrations
	docker exec -it asoose-backend yarn prisma migrate deploy

db-seed: ## Seed database
	docker exec -it asoose-backend yarn seed

db-studio: ## Open Prisma Studio
	docker exec -it asoose-backend yarn prisma studio

db-backup: ## Backup database
	docker exec asoose-postgres pg_dump -U asoose asoose_db > backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Database backed up to backup-$$(date +%Y%m%d-%H%M%S).sql"

# Kubernetes Commands
k8s-deploy: ## Deploy to Kubernetes
	cd k8s && ./deploy.sh

k8s-delete: ## Delete Kubernetes resources
	$(KUBECTL) delete namespace $(NAMESPACE)

k8s-status: ## Show Kubernetes status
	$(KUBECTL) get all -n $(NAMESPACE)

k8s-logs: ## View Kubernetes logs
	$(KUBECTL) logs -f deployment/asoose-backend -n $(NAMESPACE)

k8s-shell: ## Access backend pod shell
	$(KUBECTL) exec -it $$($(KUBECTL) get pods -n $(NAMESPACE) -l app=asoose-backend -o jsonpath='{.items[0].metadata.name}') -n $(NAMESPACE) -- sh

k8s-migrate: ## Run migrations in Kubernetes
	$(KUBECTL) exec -it $$($(KUBECTL) get pods -n $(NAMESPACE) -l app=asoose-backend -o jsonpath='{.items[0].metadata.name}') -n $(NAMESPACE) -- npx prisma migrate deploy

k8s-scale: ## Scale backend (usage: make k8s-scale REPLICAS=5)
	$(KUBECTL) scale deployment/asoose-backend --replicas=$(REPLICAS) -n $(NAMESPACE)

# AWS Commands
aws-login: ## Login to AWS ECR
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(AWS_REGION).amazonaws.com

aws-push: docker-build aws-login ## Build and push to ECR
	docker tag $(ECR_REPO):latest $$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPO):latest
	docker push $$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPO):latest
	@echo "Image pushed to ECR"

# Development Commands
dev-setup: ## Setup development environment
	cp backend/.env.example backend/.env
	@echo "Environment file created. Please update backend/.env with your values"

dev-install: ## Install dependencies
	yarn install

dev-start: ## Start development server
	yarn workspace backend start:dev

# Testing Commands
test: ## Run tests
	yarn workspace backend test

test-e2e: ## Run e2e tests
	yarn workspace backend test:e2e

# Cleanup Commands
clean: ## Clean all build artifacts
	rm -rf node_modules
	rm -rf backend/dist
	rm -rf backend/node_modules
	find . -name "*.log" -delete

clean-all: clean docker-clean ## Clean everything including Docker
	@echo "Cleaned all artifacts and Docker resources"
