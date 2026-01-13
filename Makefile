# ASOOSE Project Makefile (Backend Only)
.PHONY: help docker-build docker-up docker-down docker-logs docker-clean db-migrate db-seed db-studio clean clean-all

# Variables
DOCKER_COMPOSE = docker-compose
AWS_REGION = us-east-1
ECR_REPO = asoose-backend

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Docker Commands
docker-build: ## Build Docker image
	docker build -t $(ECR_REPO):latest -f backend/Dockerfile .

docker-up: ## Start backend container
	docker run -d --name asoose-backend -p 3000:3000 \
		-e NODE_ENV=production \
		-e DATABASE_URL="postgresql://asoose_user:K8sH7qW4eZp9@containers-us-west-123.railway.app:5432/railway_db" \
		-e DIRECT_URL="postgresql://asoose_user:K8sH7qW4eZp9@containers-us-west-123.railway.app:5432/railway_db" \
		-e REDIS_HOST="redis-hostname.railway.app" \
		-e REDIS_PORT=12345 \
		-e REDIS_PASSWORD="S7f4L0k9R1vN" \
		-e JWT_SECRET="R9v8M2hG5yU1wQ0zX7tJ6nF8kL3aB2c" \
		-e JWT_EXPIRES_IN="15m" \
		-e JWT_REFRESH_SECRET="P4x9V8cW2sM6qR1bN5yE7uH3dZ0fL8t" \
		-e JWT_REFRESH_EXPIRES_IN="7d" \
		-e EMAIL_HOST="smtp.mailtrap.io" \
		-e EMAIL_PORT=587 \
		-e EMAIL_USER="e5f2a3b1c4d5" \
		-e EMAIL_PASSWORD="aB9kL7mN2pQ3" \
		-e EMAIL_FROM="no-reply@asoose.app" \
		-e SUPABASE_URL="https://xyzcompany.supabase.co" \
		-e SUPABASE_KEY="supabase-anon-key-1234567890abcdef" \
		-e SUPABASE_BUCKET="asoose-uploads" \
		$(ECR_REPO):latest
	@echo "Backend started. Access at http://localhost:3000"

docker-down: ## Stop backend container
	docker stop asoose-backend && docker rm asoose-backend

docker-logs: ## View backend logs
	docker logs -f asoose-backend

docker-clean: ## Remove backend image
	docker rm -f asoose-backend || true
	docker rmi $(ECR_REPO):latest || true
	docker system prune -f

# Prisma Commands (assumes Railway DB)
db-migrate: ## Run database migrations
	docker exec -it asoose-backend yarn prisma migrate deploy

db-seed: ## Seed database
	docker exec -it asoose-backend yarn seed

db-studio: ## Open Prisma Studio
	docker exec -it asoose-backend yarn prisma studio

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

dev-start: ## Start development server locally
	yarn workspace backend start:dev

# Testing Commands
test: ## Run tests
	yarn workspace backend test

test-e2e: ## Run e2e tests
	yarn workspace backend test:e2e

# Cleanup Commands
clean: ## Clean build artifacts
	rm -rf node_modules
	rm -rf backend/dist
	rm -rf backend/node_modules
	find . -name "*.log" -delete

clean-all: clean docker-clean ## Clean everything including Docker
	@echo "Cleaned all artifacts and Docker resources"
