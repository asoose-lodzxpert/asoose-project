#!/bin/bash

# ASOOSE AWS Deployment Automation Script
# This script automates the deployment process outlined in AWS_DEPLOYMENT_GUIDE.md

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v eksctl &> /dev/null; then
        missing_tools+=("eksctl")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v helm &> /dev/null; then
        missing_tools+=("helm")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Please install the missing tools:"
        echo "  - AWS CLI: https://aws.amazon.com/cli/"
        echo "  - kubectl: https://kubernetes.io/docs/tasks/tools/"
        echo "  - eksctl: https://eksctl.io/"
        echo "  - Docker: https://www.docker.com/"
        echo "  - Helm: https://helm.sh/"
        exit 1
    fi
    
    print_success "All required tools are installed"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        echo "Run: aws configure"
        exit 1
    fi
    
    print_success "AWS credentials configured"
}

# Set environment variables
setup_environment() {
    print_header "Setting Up Environment Variables"
    
    export AWS_REGION=${AWS_REGION:-us-east-1}
    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    export CLUSTER_NAME=${CLUSTER_NAME:-asoose-eks-cluster}
    export PROJECT_NAME=asoose
    
    print_info "AWS Account ID: $AWS_ACCOUNT_ID"
    print_info "AWS Region: $AWS_REGION"
    print_info "Cluster Name: $CLUSTER_NAME"
    
    # Prompt for database password
    echo ""
    read -sp "Enter database password (min 8 characters): " DB_PASSWORD
    echo ""
    
    if [ ${#DB_PASSWORD} -lt 8 ]; then
        print_error "Password must be at least 8 characters"
        exit 1
    fi
    
    export DB_PASSWORD
    
    print_success "Environment variables configured"
}

# Create RDS database
create_rds() {
    print_header "Creating RDS PostgreSQL Database"
    
    # Check if already exists
    if aws rds describe-db-instances --db-instance-identifier asoose-postgres &> /dev/null; then
        print_warning "RDS instance 'asoose-postgres' already exists"
        export RDS_ENDPOINT=$(aws rds describe-db-instances \
            --db-instance-identifier asoose-postgres \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text)
        print_info "Using existing RDS endpoint: $RDS_ENDPOINT"
        return
    fi
    
    # Get default VPC and subnets
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:3].SubnetId' --output text | tr '\t' ' ')
    
    print_info "Using VPC: $VPC_ID"
    print_info "Using Subnets: $SUBNET_IDS"
    
    # Create DB subnet group
    aws rds create-db-subnet-group \
        --db-subnet-group-name asoose-db-subnet \
        --db-subnet-group-description "ASOOSE Database Subnet Group" \
        --subnet-ids $SUBNET_IDS \
        --region $AWS_REGION || true
    
    # Create security group
    RDS_SG_ID=$(aws ec2 create-security-group \
        --group-name asoose-rds-sg \
        --description "Security group for ASOOSE RDS" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text)
    
    # Allow PostgreSQL access temporarily
    aws ec2 authorize-security-group-ingress \
        --group-id $RDS_SG_ID \
        --protocol tcp \
        --port 5432 \
        --cidr 0.0.0.0/0 || true
    
    print_info "Creating RDS instance (this will take 10-15 minutes)..."
    
    # Create RDS instance with database name
    aws rds create-db-instance \
        --db-instance-identifier asoose-postgres \
        --db-instance-class db.t3.medium \
        --engine postgres \
        --engine-version 16.1 \
        --master-username asoose_admin \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 50 \
        --storage-type gp3 \
        --db-name asoose_db \
        --db-subnet-group-name asoose-db-subnet \
        --vpc-security-group-ids $RDS_SG_ID \
        --multi-az \
        --backup-retention-period 7 \
        --storage-encrypted \
        --publicly-accessible false \
        --tags Key=Environment,Value=production Key=Project,Value=asoose
    
    # Wait for RDS to be available
    print_info "Waiting for RDS instance to be available..."
    aws rds wait db-instance-available --db-instance-identifier asoose-postgres
    
    export RDS_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier asoose-postgres \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    export RDS_SG_ID
    
    print_success "RDS created successfully"
    print_info "RDS Endpoint: $RDS_ENDPOINT"
}

# Create ECR repository
create_ecr() {
    print_header "Creating ECR Repository"
    
    # Check if exists
    if aws ecr describe-repositories --repository-names asoose-backend &> /dev/null; then
        print_warning "ECR repository 'asoose-backend' already exists"
    else
        aws ecr create-repository \
            --repository-name asoose-backend \
            --region $AWS_REGION \
            --image-scanning-configuration scanOnPush=true \
            --tags Key=Environment,Value=production Key=Project,Value=asoose
        print_success "ECR repository created"
    fi
    
    export ECR_REPO=$(aws ecr describe-repositories \
        --repository-names asoose-backend \
        --query 'repositories[0].repositoryUri' \
        --output text)
    
    print_info "ECR Repository: $ECR_REPO"
}

# Build and push Docker image
build_and_push() {
    print_header "Building and Pushing Docker Image"
    
    # Login to ECR
    print_info "Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $ECR_REPO
    
    # Build image
    print_info "Building Docker image..."
    docker build -t asoose-backend:latest -f backend/Dockerfile .
    
    # Tag image
    docker tag asoose-backend:latest $ECR_REPO:latest
    docker tag asoose-backend:latest $ECR_REPO:v1.0.0
    
    # Push image
    print_info "Pushing image to ECR..."
    docker push $ECR_REPO:latest
    docker push $ECR_REPO:v1.0.0
    
    print_success "Image pushed successfully"
}

# Create EKS cluster
create_eks() {
    print_header "Creating EKS Cluster"
    
    # Check if exists
    if eksctl get cluster --name $CLUSTER_NAME --region $AWS_REGION &> /dev/null; then
        print_warning "EKS cluster '$CLUSTER_NAME' already exists"
        return
    fi
    
    # Create cluster config
    cat > eks-cluster-config.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: $CLUSTER_NAME
  region: $AWS_REGION
  version: "1.28"

managedNodeGroups:
  - name: asoose-workers
    instanceType: t3.medium
    minSize: 2
    maxSize: 6
    desiredCapacity: 3
    volumeSize: 30
    ssh:
      allow: false
    labels:
      role: worker
      environment: production
    tags:
      Environment: production
      Project: asoose
    iam:
      withAddonPolicies:
        autoScaler: true
        ebs: true
        efs: true
        albIngress: true
        cloudWatch: true

iam:
  withOIDC: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver

cloudWatch:
  clusterLogging:
    enableTypes: ["all"]
EOF
    
    print_info "Creating EKS cluster (this will take 20-30 minutes)..."
    eksctl create cluster -f eks-cluster-config.yaml
    
    print_success "EKS cluster created successfully"
    
    # Update RDS security group
    if [ ! -z "$RDS_SG_ID" ]; then
        EKS_SG=$(aws eks describe-cluster \
            --name $CLUSTER_NAME \
            --query 'cluster.resourcesVpcConfig.clusterSecurityGroupId' \
            --output text)
        
        aws ec2 revoke-security-group-ingress \
            --group-id $RDS_SG_ID \
            --protocol tcp \
            --port 5432 \
            --cidr 0.0.0.0/0 || true
        
        aws ec2 authorize-security-group-ingress \
            --group-id $RDS_SG_ID \
            --protocol tcp \
            --port 5432 \
            --source-group $EKS_SG
        
        print_success "RDS security group updated for EKS access"
    fi
}

# Install Load Balancer Controller
install_alb_controller() {
    print_header "Installing AWS Load Balancer Controller"
    
    # Download IAM policy
    curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json
    
    # Create IAM policy
    aws iam create-policy \
        --policy-name AWSLoadBalancerControllerIAMPolicy \
        --policy-document file://iam-policy.json || true
    
    # Create service account
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --namespace=kube-system \
        --name=aws-load-balancer-controller \
        --attach-policy-arn=arn:aws:iam::$AWS_ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
        --override-existing-serviceaccounts \
        --approve
    
    # Install with Helm
    helm repo add eks https://aws.github.io/eks-charts || true
    helm repo update
    
    helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName=$CLUSTER_NAME \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller || \
    helm upgrade aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName=$CLUSTER_NAME \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller
    
    print_success "Load Balancer Controller installed"
}

# Deploy application
deploy_application() {
    print_header "Deploying Application to Kubernetes"
    
    # Create namespace
    kubectl create namespace asoose || true
    
    # Generate JWT secrets
    JWT_SECRET=$(openssl rand -base64 64)
    JWT_REFRESH_SECRET=$(openssl rand -base64 64)
    
    # Create secrets
    kubectl create secret generic asoose-secrets -n asoose \
        --from-literal=DATABASE_URL="postgresql://asoose_admin:$DB_PASSWORD@$RDS_ENDPOINT:5432/asoose_db?schema=public" \
        --from-literal=DIRECT_URL="postgresql://asoose_admin:$DB_PASSWORD@$RDS_ENDPOINT:5432/asoose_db?schema=public" \
        --from-literal=JWT_SECRET="$JWT_SECRET" \
        --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
        --from-literal=REDIS_PASSWORD="" \
        --from-literal=PAYSTACK_SECRET_KEY="sk_test_xxxxx" \
        --from-literal=FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-xxxxx" \
        --from-literal=MONNIFY_SECRET_KEY="your-secret" \
        --from-literal=EMAIL_PASSWORD="your-email-password" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Update backend deployment with ECR image
    cd k8s
    sed -i.bak "s|image:.*|image: $ECR_REPO:latest|g" backend-deployment.yaml
    
    # Deploy resources
    kubectl apply -f namespace.yaml || true
    kubectl apply -f configmap.yaml
    kubectl apply -f redis-deployment.yaml
    kubectl apply -f backend-deployment.yaml
    kubectl apply -f hpa.yaml
    kubectl apply -f pdb.yaml
    kubectl apply -f network-policy.yaml || true
    kubectl apply -f ingress.yaml
    
    cd ..
    
    print_success "Application deployed"
    
    # Wait for pods
    print_info "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=asoose-backend -n asoose --timeout=300s
    
    print_success "All pods are ready"
}

# Run migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    BACKEND_POD=$(kubectl get pods -n asoose -l app=asoose-backend -o jsonpath='{.items[0].metadata.name}')
    
    print_info "Running Prisma migrations..."
    kubectl exec -it $BACKEND_POD -n asoose -- yarn prisma migrate deploy
    
    print_success "Migrations completed"
    
    # Ask to seed database
    read -p "Do you want to seed the database? (y/n): " SEED_DB
    if [ "$SEED_DB" == "y" ]; then
        kubectl exec -it $BACKEND_POD -n asoose -- yarn seed
        print_success "Database seeded"
    fi
}

# Get deployment info
get_deployment_info() {
    print_header "Deployment Information"
    
    # Get Load Balancer URL
    ALB_DNS=$(kubectl get ingress -n asoose asoose-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Deployment Completed Successfully! 🎉${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Resources Created:${NC}"
    echo "  • EKS Cluster: $CLUSTER_NAME"
    echo "  • RDS Database: asoose-postgres"
    echo "  • RDS Endpoint: $RDS_ENDPOINT"
    echo "  • ECR Repository: $ECR_REPO"
    echo "  • Load Balancer: $ALB_DNS"
    echo ""
    echo -e "${BLUE}Access Information:${NC}"
    echo "  • API URL: http://$ALB_DNS/v1/api"
    echo "  • Health Check: http://$ALB_DNS/v1/api/health"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Test API: curl http://$ALB_DNS/v1/api/health"
    echo "  2. Set up DNS: Point api.asoose.com to $ALB_DNS"
    echo "  3. Configure SSL: Create ACM certificate for api.asoose.com"
    echo "  4. Update mobile app .env: EXPO_PUBLIC_API_URL=http://$ALB_DNS/v1/api"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  • View pods: kubectl get pods -n asoose"
    echo "  • View logs: kubectl logs -n asoose -l app=asoose-backend --tail=100"
    echo "  • Scale app: kubectl scale deployment asoose-backend -n asoose --replicas=5"
    echo "  • Shell access: kubectl exec -it <pod-name> -n asoose -- sh"
    echo ""
    echo -e "${YELLOW}Important:${NC}"
    echo "  • Database Password: (saved securely)"
    echo "  • Update payment gateway secrets in k8s/secrets.yaml"
    echo "  • Configure email settings in k8s/configmap.yaml"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║                                                      ║"
    echo "║        ASOOSE AWS Deployment Automation              ║"
    echo "║                                                      ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_prerequisites
    setup_environment
    create_rds
    create_ecr
    build_and_push
    create_eks
    install_alb_controller
    deploy_application
    run_migrations
    get_deployment_info
}

# Run main function
main "$@"
