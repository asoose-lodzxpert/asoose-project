# ASOOSE AWS Deployment - Complete Step-by-Step Guide

This guide will walk you through deploying the ASOOSE project on AWS from scratch.

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] AWS Account with admin access
- [ ] AWS CLI installed ([Download](https://aws.amazon.com/cli/))
- [ ] kubectl installed ([Download](https://kubernetes.io/docs/tasks/tools/))
- [ ] eksctl installed ([Download](https://eksctl.io/))
- [ ] Docker Desktop installed and running
- [ ] Your domain name (e.g., asoose.com) - optional for production

## 🏗️ Architecture Overview

```
Internet
    ↓
CloudFront (Optional CDN)
    ↓
Route 53 (DNS)
    ↓
Application Load Balancer (ALB)
    ↓
EKS Cluster
    ├── Backend Pods (NestJS)
    ├── Redis Pod
    └── Background Workers
    ↓
RDS PostgreSQL (Database)
ElastiCache Redis (Cache) - Optional
S3 (File Storage)
```

## 🚀 Step-by-Step Deployment

### **Phase 1: AWS Account Setup (10 minutes)**

#### 1.1 Install and Configure AWS CLI

```bash
# Install AWS CLI (if not already installed)
# Windows: Download from https://aws.amazon.com/cli/
# Mac: brew install awscli
# Linux: sudo apt install awscli

# Configure AWS credentials
aws configure

# Enter your credentials:
AWS Access Key ID: YOUR_ACCESS_KEY
AWS Secret Access Key: YOUR_SECRET_KEY
Default region: us-east-1
Default output format: json

# Verify configuration
aws sts get-caller-identity
```

#### 1.2 Set Environment Variables

```bash
# Add these to your terminal session
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export CLUSTER_NAME=asoose-eks-cluster
export PROJECT_NAME=asoose

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
```

---

### **Phase 2: Database Setup (20 minutes)**

#### 2.1 Create RDS PostgreSQL Database

```bash
# Create DB subnet group (adjust subnet IDs for your VPC)
aws rds create-db-subnet-group \
  --db-subnet-group-name asoose-db-subnet \
  --db-subnet-group-description "ASOOSE Database Subnet Group" \
  --subnet-ids subnet-xxx subnet-yyy subnet-zzz \
  --region $AWS_REGION

# Create security group for RDS
aws ec2 create-security-group \
  --group-name asoose-rds-sg \
  --description "Security group for ASOOSE RDS" \
  --vpc-id vpc-xxx

# Get the security group ID
RDS_SG_ID=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=asoose-rds-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Allow PostgreSQL access (we'll update source after EKS is created)
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0  # TEMPORARY - will restrict later

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier asoose-postgres \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.1 \
  --master-username asoose_admin \
  --master-user-password "CHANGE_THIS_PASSWORD_123!" \
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

# Monitor creation status (takes ~10-15 minutes)
aws rds describe-db-instances \
  --db-instance-identifier asoose-postgres \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text

# Get RDS endpoint once available
export RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier asoose-postgres \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS Endpoint: $RDS_ENDPOINT"
```

**✅ Checkpoint:** RDS should show status "available"

---

### **Phase 3: Container Registry Setup (5 minutes)**

#### 3.1 Create ECR Repository

```bash
# Create repository for backend
aws ecr create-repository \
  --repository-name asoose-backend \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true \
  --tags Key=Environment,Value=production Key=Project,Value=asoose

# Get repository URI
export ECR_REPO=$(aws ecr describe-repositories \
  --repository-names asoose-backend \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR Repository: $ECR_REPO"

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REPO
```

**✅ Checkpoint:** Docker login should succeed

---

### **Phase 4: Build and Push Docker Image (10 minutes)**

#### 4.1 Build and Push Backend Image

```bash
# Navigate to project root
cd /path/to/asoose-project

# Build the Docker image
docker build -t asoose-backend:latest -f backend/Dockerfile .

# Tag for ECR
docker tag asoose-backend:latest $ECR_REPO:latest
docker tag asoose-backend:latest $ECR_REPO:v1.0.0

# Push to ECR
docker push $ECR_REPO:latest
docker push $ECR_REPO:v1.0.0

# Verify images
aws ecr list-images --repository-name asoose-backend
```

**✅ Checkpoint:** Images should appear in ECR console

---

### **Phase 5: EKS Cluster Setup (30 minutes)**

#### 5.1 Create EKS Cluster

```bash
# Create cluster config file
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

# Create cluster (takes ~20 minutes)
eksctl create cluster -f eks-cluster-config.yaml

# Verify cluster
kubectl get nodes
kubectl get namespaces
```

#### 5.2 Update RDS Security Group

```bash
# Get EKS cluster security group
EKS_SG=$(aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --query 'cluster.resourcesVpcConfig.clusterSecurityGroupId' \
  --output text)

# Update RDS security group to allow EKS access
aws ec2 revoke-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EKS_SG
```

**✅ Checkpoint:** `kubectl get nodes` should show 3 nodes in Ready state

---

### **Phase 6: Install AWS Load Balancer Controller (10 minutes)**

#### 6.1 Install Load Balancer Controller

```bash
# Download IAM policy
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json

# Create IAM policy
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::$AWS_ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve

# Install with Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Verify
kubectl get deployment -n kube-system aws-load-balancer-controller
```

**✅ Checkpoint:** Controller should be running

---

### **Phase 7: Configure Kubernetes Secrets (5 minutes)**

#### 7.1 Create Kubernetes Secrets

```bash
# Create namespace
kubectl create namespace asoose

# Generate JWT secrets
export JWT_SECRET=$(openssl rand -base64 64)
export JWT_REFRESH_SECRET=$(openssl rand -base64 64)

# Create secrets
kubectl create secret generic asoose-secrets -n asoose \
  --from-literal=DATABASE_URL="postgresql://asoose_admin:CHANGE_THIS_PASSWORD_123!@$RDS_ENDPOINT:5432/asoose_db?schema=public" \
  --from-literal=DIRECT_URL="postgresql://asoose_admin:CHANGE_THIS_PASSWORD_123!@$RDS_ENDPOINT:5432/asoose_db?schema=public" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --from-literal=REDIS_PASSWORD="" \
  --from-literal=PAYSTACK_SECRET_KEY="sk_test_xxxxx" \
  --from-literal=FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-xxxxx" \
  --from-literal=MONNIFY_SECRET_KEY="your-secret" \
  --from-literal=EMAIL_PASSWORD="your-email-password"

# Verify
kubectl get secrets -n asoose
```

---

### **Phase 8: Update Kubernetes Manifests (10 minutes)**

#### 8.1 Update Deployment Files

```bash
cd k8s

# Update backend-deployment.yaml with ECR image
sed -i "s|image:.*|image: $ECR_REPO:latest|g" backend-deployment.yaml

# Update configmap.yaml with production values
cat > configmap.yaml <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: asoose-config
  namespace: asoose
data:
  NODE_ENV: "production"
  PORT: "3000"
  API_PREFIX: "v1/api"

  # Redis
  REDIS_HOST: "asoose-redis"
  REDIS_PORT: "6379"

  # JWT
  JWT_EXPIRES_IN: "7d"
  JWT_REFRESH_EXPIRES_IN: "30d"

  # Email
  EMAIL_HOST: "smtp.gmail.com"
  EMAIL_PORT: "587"
  EMAIL_SECURE: "false"
  EMAIL_FROM: "noreply@asoose.com"

  # Storage
  STORAGE_TYPE: "s3"
  AWS_S3_BUCKET: "asoose-uploads-prod"
  AWS_S3_REGION: "$AWS_REGION"

  # URLs
  BACKEND_URL: "https://api.asoose.com"
  CUSTOMER_WEB_URL: "https://asoose.com"

  # Payment Gateways
  MONNIFY_BASE_URL: "https://api.monnify.com"

  # Misc
  CORS_ORIGIN: "https://asoose.com,https://app.asoose.com"
  THROTTLE_TTL: "60"
  THROTTLE_LIMIT: "100"
EOF
```

---

### **Phase 9: Deploy Application (10 minutes)**

#### 9.1 Deploy to Kubernetes

```bash
# Deploy all resources
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f hpa.yaml
kubectl apply -f pdb.yaml
kubectl apply -f network-policy.yaml
kubectl apply -f ingress.yaml

# Monitor deployment
kubectl get pods -n asoose -w

# Check logs
kubectl logs -n asoose -l app=asoose-backend --tail=100 -f
```

#### 9.2 Run Database Migrations

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -n asoose -l app=asoose-backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -it $BACKEND_POD -n asoose -- yarn prisma migrate deploy

# Seed database (optional)
kubectl exec -it $BACKEND_POD -n asoose -- yarn seed
```

**✅ Checkpoint:** All pods should be Running

---

### **Phase 10: Configure DNS & SSL (15 minutes)**

#### 10.1 Get Load Balancer URL

```bash
# Get ALB DNS name
export ALB_DNS=$(kubectl get ingress -n asoose asoose-ingress \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Load Balancer DNS: $ALB_DNS"
```

#### 10.2 Create ACM Certificate

```bash
# Request certificate
aws acm request-certificate \
  --domain-name api.asoose.com \
  --subject-alternative-names "*.asoose.com" \
  --validation-method DNS \
  --region $AWS_REGION

# Get certificate ARN
export CERT_ARN=$(aws acm list-certificates \
  --query 'CertificateSummaryList[0].CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Get DNS validation records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord'
```

**Add the DNS validation records to your domain registrar (e.g., GoDaddy, Namecheap, Route 53)**

#### 10.3 Configure Route 53 (if using AWS for DNS)

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name asoose.com \
  --caller-reference $(date +%s)

# Get hosted zone ID
export ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name asoose.com \
  --query 'HostedZones[0].Id' \
  --output text | cut -d'/' -f3)

# Create A record pointing to ALB
cat > change-batch.json <<EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "api.asoose.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "$ALB_DNS"}]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://change-batch.json
```

#### 10.4 Update Ingress with Certificate

```bash
# Update ingress.yaml
kubectl annotate ingress asoose-ingress -n asoose \
  alb.ingress.kubernetes.io/certificate-arn=$CERT_ARN \
  --overwrite

# Force ingress recreation
kubectl delete ingress asoose-ingress -n asoose
kubectl apply -f ingress.yaml
```

**✅ Checkpoint:** https://api.asoose.com/v1/api should be accessible

---

### **Phase 11: Set Up S3 for File Storage (5 minutes)**

```bash
# Create S3 bucket
aws s3 mb s3://asoose-uploads-prod --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket asoose-uploads-prod \
  --versioning-configuration Status=Enabled

# Configure CORS
cat > cors-config.json <<EOF
{
  "CORSRules": [{
    "AllowedOrigins": ["https://asoose.com", "https://app.asoose.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}
EOF

aws s3api put-bucket-cors \
  --bucket asoose-uploads-prod \
  --cors-configuration file://cors-config.json

# Create IAM policy for S3 access
cat > s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::asoose-uploads-prod/*",
      "arn:aws:s3:::asoose-uploads-prod"
    ]
  }]
}
EOF

aws iam create-policy \
  --policy-name AsooseS3AccessPolicy \
  --policy-document file://s3-policy.json

# Attach to node group role
NODE_ROLE=$(aws eks describe-nodegroup \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name asoose-workers \
  --query 'nodegroup.nodeRole' \
  --output text | cut -d'/' -f2)

aws iam attach-role-policy \
  --role-name $NODE_ROLE \
  --policy-arn arn:aws:iam::$AWS_ACCOUNT_ID:policy/AsooseS3AccessPolicy
```

---

### **Phase 12: Monitoring & Logging (10 minutes)**

#### 12.1 Install Metrics Server

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify
kubectl get deployment metrics-server -n kube-system
```

#### 12.2 Set Up CloudWatch Container Insights

```bash
# Install CloudWatch agent
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluentd-quickstart.yaml

# Verify
kubectl get pods -n amazon-cloudwatch
```

---

## 🧪 Testing & Verification

### Test Backend API

```bash
# Health check
curl https://api.asoose.com/v1/api/health

# Test authentication
curl -X POST https://api.asoose.com/v1/api/auth/vendor/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@vendor.com","password":"password123"}'
```

### Check Logs

```bash
# Application logs
kubectl logs -n asoose -l app=asoose-backend --tail=100

# Watch logs in real-time
kubectl logs -n asoose -l app=asoose-backend -f

# Check specific pod
kubectl logs -n asoose <pod-name>
```

### Monitor Resources

```bash
# Check pod status
kubectl get pods -n asoose

# Check resource usage
kubectl top pods -n asoose
kubectl top nodes

# Check HPA status
kubectl get hpa -n asoose

# Check ingress
kubectl get ingress -n asoose
kubectl describe ingress asoose-ingress -n asoose
```

---

## 🔧 Useful Commands

### Application Management

```bash
# Scale deployment
kubectl scale deployment asoose-backend -n asoose --replicas=5

# Restart deployment
kubectl rollout restart deployment asoose-backend -n asoose

# Update image
kubectl set image deployment/asoose-backend \
  backend=$ECR_REPO:v1.0.1 -n asoose

# Rollback deployment
kubectl rollout undo deployment asoose-backend -n asoose

# Check rollout status
kubectl rollout status deployment asoose-backend -n asoose
```

### Debugging

```bash
# Get pod shell
kubectl exec -it <pod-name> -n asoose -- sh

# Port forward to local
kubectl port-forward -n asoose svc/asoose-backend 3000:3000

# View events
kubectl get events -n asoose --sort-by='.lastTimestamp'

# Describe resources
kubectl describe pod <pod-name> -n asoose
kubectl describe svc asoose-backend -n asoose
```

---

## 💰 Cost Estimation (Monthly)

| Service                   | Configuration         | Estimated Cost  |
| ------------------------- | --------------------- | --------------- |
| EKS Cluster               | Control plane         | $73             |
| EC2 Nodes                 | 3 x t3.medium         | ~$90            |
| RDS PostgreSQL            | db.t3.medium Multi-AZ | ~$120           |
| Application Load Balancer | 1 ALB                 | ~$25            |
| Data Transfer             | 100 GB/month          | ~$9             |
| CloudWatch Logs           | 10 GB/month           | ~$5             |
| ECR Storage               | 10 GB                 | ~$1             |
| **Total**                 |                       | **~$323/month** |

_Prices are approximate and based on us-east-1 region_

---

## 🔒 Security Best Practices

1. **Enable VPC Flow Logs**
2. **Use AWS Secrets Manager** for sensitive data
3. **Enable AWS WAF** on ALB
4. **Set up AWS GuardDuty** for threat detection
5. **Use IAM roles** instead of access keys
6. **Enable MFA** for AWS root account
7. **Regularly update** EKS and node AMIs
8. **Implement network policies** in Kubernetes
9. **Use Pod Security Standards**
10. **Enable audit logging** in EKS

---

## 📊 Next Steps

- [ ] Set up CI/CD pipeline with GitHub Actions
- [ ] Configure auto-scaling policies
- [ ] Set up disaster recovery plan
- [ ] Implement blue-green deployments
- [ ] Add monitoring dashboards (Grafana)
- [ ] Configure alerting (PagerDuty/Slack)
- [ ] Set up backup automation
- [ ] Implement cost optimization
- [ ] Add CDN (CloudFront)
- [ ] Set up staging environment

---

## 🆘 Troubleshooting

### Common Issues

**Pods not starting**

```bash
kubectl describe pod <pod-name> -n asoose
kubectl logs <pod-name> -n asoose
```

**Database connection failed**

```bash
# Test from pod
kubectl exec -it <pod-name> -n asoose -- sh
apk add postgresql-client
psql -h $RDS_ENDPOINT -U asoose_admin -d postgres
```

**Ingress not working**

```bash
kubectl describe ingress asoose-ingress -n asoose
kubectl get svc -n kube-system | grep aws-load-balancer
```

**Certificate not validating**

```bash
aws acm describe-certificate --certificate-arn $CERT_ARN
# Add DNS validation records shown in output
```

---

## 📞 Support

For issues or questions:

- Check application logs: `kubectl logs -n asoose -l app=asoose-backend`
- Check AWS CloudWatch Logs
- Review EKS cluster events
- Check ALB target health in AWS Console

---

**Deployment completed! 🎉**

Your ASOOSE application is now running on AWS with:

- High availability (Multi-AZ)
- Auto-scaling
- SSL/TLS encryption
- Load balancing
- Monitoring and logging
- Automated backups
