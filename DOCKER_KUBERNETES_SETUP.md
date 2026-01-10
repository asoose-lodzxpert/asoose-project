# ASOOSE Docker & Kubernetes Setup

## Quick Start - Local Development with Docker

### Prerequisites

- Docker Desktop installed
- Docker Compose installed

### 1. Clone and Setup

```bash
git clone <repository-url>
cd asoose-project
```

### 2. Create Environment File

```bash
cd backend
cp .env.example .env
# Edit .env with your local values
```

### 3. Start with Docker Compose

```bash
# From project root
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### 4. Run Migrations

```bash
# Access backend container
docker exec -it asoose-backend sh

# Run migrations
npx prisma migrate deploy

# Seed database
npm run seed

# Exit container
exit
```

### 5. Access Services

- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Production Deployment - AWS EKS

See [k8s/README.md](k8s/README.md) for complete Kubernetes deployment guide.

### Quick Deploy

```bash
# 1. Configure AWS CLI
aws configure

# 2. Create EKS cluster (takes ~15 minutes)
eksctl create cluster -f k8s/cluster-config.yaml

# 3. Build and push Docker image
docker build -t asoose-backend:latest -f backend/Dockerfile .
docker tag asoose-backend:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/asoose-backend:latest
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/asoose-backend:latest

# 4. Update configuration files
# - Update k8s/configmap.yaml with RDS endpoint
# - Update k8s/secrets.yaml with base64-encoded secrets
# - Update k8s/backend-deployment.yaml with ECR image URL
# - Update k8s/ingress.yaml with ACM certificate ARN

# 5. Deploy to Kubernetes
cd k8s
chmod +x deploy.sh
./deploy.sh

# 6. Get load balancer URL
kubectl get ingress -n asoose
```

## Docker Commands Reference

### Build Images

```bash
# Build backend
docker build -t asoose-backend -f backend/Dockerfile .

# Build with specific tag
docker build -t asoose-backend:v1.0.0 -f backend/Dockerfile .
```

### Run Containers

```bash
# Run backend only (requires external DB & Redis)
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_HOST="localhost" \
  --name asoose-backend \
  asoose-backend:latest

# Run with docker-compose
docker-compose up -d backend
```

### Manage Containers

```bash
# List running containers
docker ps

# View logs
docker logs -f asoose-backend

# Execute commands in container
docker exec -it asoose-backend sh

# Stop container
docker stop asoose-backend

# Remove container
docker rm asoose-backend

# Remove all stopped containers
docker container prune
```

### Database Operations

```bash
# Backup database
docker exec asoose-postgres pg_dump -U asoose asoose_db > backup.sql

# Restore database
docker exec -i asoose-postgres psql -U asoose asoose_db < backup.sql

# Access PostgreSQL CLI
docker exec -it asoose-postgres psql -U asoose -d asoose_db
```

## Kubernetes Commands Reference

### Cluster Management

```bash
# Get cluster info
kubectl cluster-info

# View nodes
kubectl get nodes

# View namespaces
kubectl get namespaces
```

### Application Management

```bash
# Get all resources
kubectl get all -n asoose

# Get pods
kubectl get pods -n asoose -o wide

# Describe pod
kubectl describe pod POD_NAME -n asoose

# View logs
kubectl logs -f POD_NAME -n asoose

# Execute command in pod
kubectl exec -it POD_NAME -n asoose -- sh

# Port forward (for debugging)
kubectl port-forward service/asoose-backend-service 3000:80 -n asoose
```

### Scaling

```bash
# Scale deployment
kubectl scale deployment/asoose-backend --replicas=5 -n asoose

# View HPA status
kubectl get hpa -n asoose

# Edit HPA
kubectl edit hpa asoose-backend-hpa -n asoose
```

### Updates & Rollbacks

```bash
# Update image
kubectl set image deployment/asoose-backend \
  backend=ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/asoose-backend:v1.1.0 \
  -n asoose

# Check rollout status
kubectl rollout status deployment/asoose-backend -n asoose

# View rollout history
kubectl rollout history deployment/asoose-backend -n asoose

# Rollback to previous version
kubectl rollout undo deployment/asoose-backend -n asoose

# Rollback to specific revision
kubectl rollout undo deployment/asoose-backend --to-revision=2 -n asoose
```

### Secrets Management

```bash
# Create secret from literal
kubectl create secret generic my-secret \
  --from-literal=key1=value1 \
  --from-literal=key2=value2 \
  -n asoose

# Create secret from file
kubectl create secret generic my-secret \
  --from-file=./secret-file.txt \
  -n asoose

# View secrets (base64 encoded)
kubectl get secret asoose-backend-secrets -n asoose -o yaml

# Decode secret
kubectl get secret asoose-backend-secrets -n asoose -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

### Debugging

```bash
# Get events
kubectl get events -n asoose --sort-by='.lastTimestamp'

# Describe deployment
kubectl describe deployment asoose-backend -n asoose

# Get pod logs (previous container)
kubectl logs POD_NAME -n asoose --previous

# Get all pod logs
kubectl logs -l app=asoose-backend -n asoose --all-containers=true

# Run debug pod
kubectl run debug --image=busybox -it --rm --restart=Never -n asoose -- sh
```

## Troubleshooting

### Docker Issues

**Container won't start:**

```bash
docker logs asoose-backend
docker inspect asoose-backend
```

**Permission issues:**

```bash
# Fix on Linux/Mac
sudo chown -R $USER:$USER .
```

**Port already in use:**

```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 PID
```

### Kubernetes Issues

**Pods in CrashLoopBackOff:**

```bash
kubectl logs POD_NAME -n asoose
kubectl describe pod POD_NAME -n asoose
```

**Image pull errors:**

```bash
# Check ECR login
aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com

# Verify image exists
aws ecr describe-images --repository-name asoose-backend --region REGION
```

**Database connection issues:**

```bash
# Test from pod
kubectl exec -it POD_NAME -n asoose -- nc -zv DB_HOST 5432
```

## CI/CD with GitHub Actions

The project includes automated deployment via GitHub Actions.

### Setup

1. Add secrets to GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

2. Push to main branch triggers deployment

3. Monitor deployment:
   ```bash
   # Via GitHub Actions UI
   # Or check cluster
   kubectl get pods -n asoose -w
   ```

## Monitoring

### Logs

```bash
# Docker Compose
docker-compose logs -f

# Kubernetes
kubectl logs -f deployment/asoose-backend -n asoose

# CloudWatch (if configured)
aws logs tail /aws/eks/asoose-eks-cluster/cluster --follow
```

### Metrics

```bash
# Pod metrics
kubectl top pods -n asoose

# Node metrics
kubectl top nodes

# HPA status
kubectl get hpa -n asoose -w
```

## Cleanup

### Docker

```bash
# Stop all containers
docker-compose down

# Remove volumes
docker-compose down -v

# Remove images
docker rmi asoose-backend
```

### Kubernetes

```bash
# Delete namespace (removes all resources)
kubectl delete namespace asoose

# Delete cluster
eksctl delete cluster --name asoose-eks-cluster --region REGION
```

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [eksctl Documentation](https://eksctl.io/)
