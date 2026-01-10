#!/bin/bash

# ASOOSE Kubernetes Deployment Script for AWS EKS
# This script deploys the ASOOSE application to AWS EKS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-asoose-eks-cluster}"
REGION="${AWS_REGION:-us-east-1}"
NAMESPACE="asoose"
ECR_REPO="${ECR_REPO:-asoose-backend}"

echo -e "${GREEN}Starting ASOOSE Kubernetes Deployment${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}kubectl is not installed. Please install kubectl.${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install AWS CLI.${NC}"
    exit 1
fi

if ! command -v eksctl &> /dev/null; then
    echo -e "${RED}eksctl is not installed. Please install eksctl.${NC}"
    exit 1
fi

# Update kubeconfig
echo -e "${YELLOW}Updating kubeconfig for cluster: ${CLUSTER_NAME}${NC}"
aws eks update-kubeconfig --name ${CLUSTER_NAME} --region ${REGION}

# Create namespace
echo -e "${YELLOW}Creating namespace: ${NAMESPACE}${NC}"
kubectl apply -f k8s/namespace.yaml

# Apply ConfigMap
echo -e "${YELLOW}Applying ConfigMap...${NC}"
kubectl apply -f k8s/configmap.yaml

# Apply Secrets
echo -e "${YELLOW}Applying Secrets...${NC}"
echo -e "${RED}WARNING: Update secrets.yaml with your actual base64-encoded values before production!${NC}"
kubectl apply -f k8s/secrets.yaml

# Deploy Redis
echo -e "${YELLOW}Deploying Redis...${NC}"
kubectl apply -f k8s/redis-deployment.yaml

# Wait for Redis to be ready
echo -e "${YELLOW}Waiting for Redis to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=asoose-redis -n ${NAMESPACE} --timeout=300s

# Deploy Backend
echo -e "${YELLOW}Deploying Backend...${NC}"
kubectl apply -f k8s/backend-deployment.yaml

# Wait for Backend to be ready
echo -e "${YELLOW}Waiting for Backend to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=asoose-backend -n ${NAMESPACE} --timeout=300s

# Apply HPA
echo -e "${YELLOW}Applying Horizontal Pod Autoscaler...${NC}"
kubectl apply -f k8s/hpa.yaml

# Apply PDB
echo -e "${YELLOW}Applying Pod Disruption Budgets...${NC}"
kubectl apply -f k8s/pdb.yaml

# Apply Network Policies
echo -e "${YELLOW}Applying Network Policies...${NC}"
kubectl apply -f k8s/network-policy.yaml

# Apply Ingress
echo -e "${YELLOW}Applying Ingress...${NC}"
echo -e "${RED}WARNING: Update ingress.yaml with your ACM certificate ARN and domain!${NC}"
kubectl apply -f k8s/ingress.yaml

# Display deployment status
echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${YELLOW}Checking deployment status...${NC}"
kubectl get all -n ${NAMESPACE}

echo ""
echo -e "${GREEN}Getting Ingress details...${NC}"
kubectl get ingress -n ${NAMESPACE}

echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "kubectl logs -f deployment/asoose-backend -n ${NAMESPACE}"

echo ""
echo -e "${YELLOW}To scale deployment:${NC}"
echo "kubectl scale deployment/asoose-backend --replicas=5 -n ${NAMESPACE}"

echo ""
echo -e "${GREEN}Deployment script completed successfully!${NC}"
