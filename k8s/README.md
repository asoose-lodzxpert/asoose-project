# ASOOSE Kubernetes Deployment Guide for AWS EKS

This guide will help you deploy the ASOOSE application to AWS Elastic Kubernetes Service (EKS).

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **kubectl** installed
4. **eksctl** installed
5. **Docker** installed
6. **Helm** installed (optional, for additional components)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Cloud                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                    EKS Cluster                      │    │
│  │                                                     │    │
│  │  ┌──────────────┐      ┌──────────────┐          │    │
│  │  │   Backend    │      │    Redis     │          │    │
│  │  │  (3+ pods)   │◄────►│   (1 pod)    │          │    │
│  │  └──────────────┘      └──────────────┘          │    │
│  │         ▲                                          │    │
│  │         │                                          │    │
│  │         ▼                                          │    │
│  │  ┌──────────────┐                                 │    │
│  │  │     ALB      │                                 │    │
│  │  │   Ingress    │                                 │    │
│  │  └──────────────┘                                 │    │
│  └────────┬─────────────────────────────────────────┘    │
│           │                                               │
│  ┌────────▼─────────┐      ┌──────────────┐             │
│  │   RDS Postgres   │      │   ElastiCache │             │
│  │   (Multi-AZ)     │      │    (Optional)  │             │
│  └──────────────────┘      └──────────────┘             │
└─────────────────────────────────────────────────────────┘
```

## Step 1: Create EKS Cluster

### Using eksctl (Recommended)

```bash
# Create cluster configuration file
cat > cluster-config.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: asoose-eks-cluster
  region: us-east-1
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
    tags:
      Environment: production
      Project: asoose

iam:
  withOIDC: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver
EOF

# Create the cluster
eksctl create cluster -f cluster-config.yaml
```

### Verify Cluster

```bash
kubectl get nodes
kubectl get namespaces
```

## Step 2: Set Up AWS Resources

### Create RDS PostgreSQL Database

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name asoose-db-subnet \
  --db-subnet-group-description "ASOOSE Database Subnet Group" \
  --subnet-ids subnet-xxx subnet-yyy \
  --tags Key=Environment,Value=production Key=Project,Value=asoose

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier asoose-postgres \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.1 \
  --master-username asoose_admin \
  --master-user-password <STRONG_PASSWORD> \
  --allocated-storage 50 \
  --storage-type gp3 \
  --db-subnet-group-name asoose-db-subnet \
  --vpc-security-group-ids sg-xxxxx \
  --multi-az \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "Mon:04:00-Mon:05:00" \
  --storage-encrypted \
  --enable-cloudwatch-logs-exports postgresql \
  --tags Key=Environment,Value=production Key=Project,Value=asoose

# Get RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier asoose-postgres \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

Update `k8s/configmap.yaml` with the RDS endpoint.

### Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name asoose-backend \
  --region us-east-1 \
  --tags Key=Environment,Value=production Key=Project,Value=asoose

# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

### Create ACM Certificate

```bash
# Request certificate
aws acm request-certificate \
  --domain-name api.asoose.com \
  --subject-alternative-names "*.asoose.com" \
  --validation-method DNS \
  --region us-east-1 \
  --tags Key=Environment,Value=production Key=Project,Value=asoose

# Get certificate ARN (after DNS validation)
aws acm list-certificates --region us-east-1
```

Update `k8s/ingress.yaml` with the certificate ARN.

## Step 3: Install AWS Load Balancer Controller

```bash
# Download IAM policy
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json

# Create IAM policy
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=asoose-eks-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve

# Install with Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=asoose-eks-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Verify installation
kubectl get deployment -n kube-system aws-load-balancer-controller
```

## Step 4: Install Metrics Server (for HPA)

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify
kubectl get deployment metrics-server -n kube-system
```

## Step 5: Install External Secrets Operator (Optional but Recommended)

```bash
# Install with Helm
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace

# Create IAM policy for Secrets Manager
cat > secrets-manager-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:asoose/*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ASOOSESecretsManagerPolicy \
  --policy-document file://secrets-manager-policy.json

# Create service account
eksctl create iamserviceaccount \
  --name asoose-backend-sa \
  --namespace asoose \
  --cluster asoose-eks-cluster \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/ASOOSESecretsManagerPolicy \
  --approve

# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name asoose/backend/secrets \
  --description "ASOOSE Backend Secrets" \
  --secret-string '{
    "POSTGRES_USER": "asoose_admin",
    "POSTGRES_PASSWORD": "your-db-password",
    "REDIS_PASSWORD": "your-redis-password",
    "JWT_SECRET": "your-jwt-secret",
    "JWT_REFRESH_SECRET": "your-refresh-secret",
    "EMAIL_HOST": "smtp.gmail.com",
    "EMAIL_USER": "your-email@gmail.com",
    "EMAIL_PASSWORD": "your-email-password",
    "EMAIL_FROM": "noreply@asoose.com",
    "SUPABASE_URL": "https://your-project.supabase.co",
    "SUPABASE_KEY": "your-supabase-key"
  }'
```

## Step 6: Build and Push Docker Image

```bash
# Navigate to project root
cd /path/to/asoose-project

# Build image
docker build -t asoose-backend:latest -f backend/Dockerfile .

# Tag image
docker tag asoose-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/asoose-backend:latest

# Push image
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/asoose-backend:latest
```

## Step 7: Update Kubernetes Manifests

Update the following files with your specific values:

1. **k8s/configmap.yaml**
   - Update `DB_HOST` with your RDS endpoint

2. **k8s/secrets.yaml**
   - Base64 encode all your secrets
   - Update External Secrets configuration

3. **k8s/backend-deployment.yaml**
   - Update `image` with your ECR repository URL
   - Update service account ARN

4. **k8s/ingress.yaml**
   - Update `certificate-arn` with your ACM certificate ARN
   - Update `host` with your domain
   - Update security group ID

## Step 8: Deploy Application

```bash
# Make deploy script executable
chmod +x k8s/deploy.sh

# Run deployment
./k8s/deploy.sh

# Or deploy manually:
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/pdb.yaml
kubectl apply -f k8s/network-policy.yaml
kubectl apply -f k8s/ingress.yaml
```

## Step 9: Run Database Migrations

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -n asoose -l app=asoose-backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -it $BACKEND_POD -n asoose -- npx prisma migrate deploy

# Run seed (if needed)
kubectl exec -it $BACKEND_POD -n asoose -- npm run seed
```

## Step 10: Configure DNS

Point your domain to the ALB:

```bash
# Get ALB DNS name
kubectl get ingress asoose-ingress -n asoose -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Create Route53 A record (alias) pointing to the ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.asoose.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z215JYRZR1TBD5",
          "DNSName": "k8s-asoose-xxxx.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

## Monitoring and Maintenance

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/asoose-backend -n asoose

# Redis logs
kubectl logs -f deployment/asoose-redis -n asoose

# All pods
kubectl logs -f -l app=asoose-backend -n asoose --all-containers=true
```

### Check Status

```bash
# All resources
kubectl get all -n asoose

# Pods
kubectl get pods -n asoose -o wide

# HPA status
kubectl get hpa -n asoose

# Ingress
kubectl get ingress -n asoose
```

### Scale Application

```bash
# Manual scaling
kubectl scale deployment/asoose-backend --replicas=5 -n asoose

# Update HPA
kubectl patch hpa asoose-backend-hpa -n asoose -p '{"spec":{"maxReplicas":15}}'
```

### Update Application

```bash
# Build new image with version tag
docker build -t asoose-backend:v1.1.0 -f backend/Dockerfile .
docker tag asoose-backend:v1.1.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/asoose-backend:v1.1.0
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/asoose-backend:v1.1.0

# Update deployment
kubectl set image deployment/asoose-backend backend=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/asoose-backend:v1.1.0 -n asoose

# Check rollout status
kubectl rollout status deployment/asoose-backend -n asoose

# Rollback if needed
kubectl rollout undo deployment/asoose-backend -n asoose
```

## Security Best Practices

1. **Use External Secrets Operator** for secret management
2. **Enable Network Policies** to restrict pod communication
3. **Use Pod Security Standards** (PSS)
4. **Enable AWS WAF** on ALB for DDoS protection
5. **Use VPC endpoints** for AWS services
6. **Enable encryption** at rest and in transit
7. **Regular security updates** for base images
8. **Use least privilege** IAM roles

## Cost Optimization

1. **Use Spot Instances** for non-critical workloads
2. **Right-size** your node groups
3. **Enable Cluster Autoscaler**
4. **Use GP3 volumes** instead of GP2
5. **Monitor and optimize** resource requests/limits
6. **Use RDS Reserved Instances** for production

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod POD_NAME -n asoose
kubectl logs POD_NAME -n asoose --previous
```

### Database connection issues

```bash
# Test connection from pod
kubectl exec -it POD_NAME -n asoose -- sh
nc -zv RDS_ENDPOINT 5432
```

### Ingress not working

```bash
kubectl describe ingress asoose-ingress -n asoose
kubectl logs -n kube-system deployment/aws-load-balancer-controller
```

## Clean Up

```bash
# Delete Kubernetes resources
kubectl delete namespace asoose

# Delete EKS cluster
eksctl delete cluster --name asoose-eks-cluster --region us-east-1

# Delete RDS instance
aws rds delete-db-instance --db-instance-identifier asoose-postgres --skip-final-snapshot

# Delete ECR repository
aws ecr delete-repository --repository-name asoose-backend --force
```

## Support

For issues or questions:

- Check logs: `kubectl logs -f deployment/asoose-backend -n asoose`
- Check events: `kubectl get events -n asoose --sort-by='.lastTimestamp'`
- Describe resources: `kubectl describe deployment asoose-backend -n asoose`
