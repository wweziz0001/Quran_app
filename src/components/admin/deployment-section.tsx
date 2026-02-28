'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Rocket,
  Container,
  Cloud,
  GitBranch,
  Server,
  CheckCircle
} from 'lucide-react';

const dockerCompose = `# docker-compose.yml
version: '3.8'

services:
  # API Server
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: quran-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/quran_db
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=\${JWT_SECRET}
      - S3_BUCKET=\${S3_BUCKET}
      - S3_ACCESS_KEY=\${S3_ACCESS_KEY}
      - S3_SECRET_KEY=\${S3_SECRET_KEY}
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - quran-network

  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: quran-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=\${DB_USER}
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
      - POSTGRES_DB=quran_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER} -d quran_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - quran-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: quran-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - quran-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: quran-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - api
    networks:
      - quran-network

volumes:
  postgres_data:
  redis_data:

networks:
  quran-network:
    driver: bridge
`.trim();

const dockerfile = `# Dockerfile - Multi-stage build
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
`.trim();

const githubActions = `# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Run e2e tests
        run: npm run test:e2e

  build-and-push:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: \${{ secrets.PRODUCTION_HOST }}
          username: \${{ secrets.PRODUCTION_USER }}
          key: \${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/quran-app
            docker-compose pull
            docker-compose up -d --remove-orphans
            docker image prune -f
`.trim();

const kubernetes = `# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quran-api
  namespace: quran-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: quran-api
  template:
    metadata:
      labels:
        app: quran-api
    spec:
      containers:
        - name: api
          image: ghcr.io/org/quran-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: quran-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: quran-secrets
                  key: redis-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: quran-secrets
                  key: jwt-secret
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: quran-api-service
  namespace: quran-app
spec:
  selector:
    app: quran-api
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: quran-api-hpa
  namespace: quran-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: quran-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
`.trim();

export function DeploymentSection() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deployment Configuration
          </CardTitle>
          <CardDescription>
            Production deployment strategy with Docker and Kubernetes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-500/10">
              <Container className="h-5 w-5 text-sky-500" />
              <div>
                <p className="font-medium">Docker</p>
                <p className="text-xs text-muted-foreground">Multi-stage builds</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
              <GitBranch className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">GitHub Actions</p>
                <p className="text-xs text-muted-foreground">CI/CD Pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10">
              <Cloud className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-medium">Kubernetes</p>
                <p className="text-xs text-muted-foreground">Auto-scaling</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10">
              <Server className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">CloudFront</p>
                <p className="text-xs text-muted-foreground">CDN for audio</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="docker" className="space-y-4">
        <TabsList>
          <TabsTrigger value="docker" className="flex items-center gap-2">
            <Container className="h-4 w-4" />
            Docker Compose
          </TabsTrigger>
          <TabsTrigger value="dockerfile" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Dockerfile
          </TabsTrigger>
          <TabsTrigger value="cicd" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            CI/CD Pipeline
          </TabsTrigger>
          <TabsTrigger value="kubernetes" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Kubernetes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="docker">
          <Card>
            <CardHeader>
              <CardTitle>Docker Compose Configuration</CardTitle>
              <CardDescription>
                Local development and production deployment setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {dockerCompose}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dockerfile">
          <Card>
            <CardHeader>
              <CardTitle>Multi-stage Dockerfile</CardTitle>
              <CardDescription>
                Optimized production Docker image
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {dockerfile}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cicd">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Actions CI/CD</CardTitle>
              <CardDescription>
                Automated testing, building, and deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {githubActions}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kubernetes">
          <Card>
            <CardHeader>
              <CardTitle>Kubernetes Deployment</CardTitle>
              <CardDescription>
                Production-grade deployment with auto-scaling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {kubernetes}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Architecture */}
      <Card>
        <CardHeader>
          <CardTitle>Production Architecture</CardTitle>
          <CardDescription>
            High-availability architecture for 500,000+ users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Infrastructure</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  3 API server replicas (auto-scaling)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  PostgreSQL with read replicas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Redis cluster for caching
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  CloudFront CDN for audio files
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Load balancer (Nginx/ALB)
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Scaling Strategy</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Horizontal pod autoscaling (3-10 pods)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Database connection pooling (PgBouncer)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  CDN edge caching (audio/images)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  API response caching (Redis)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Background job queue (Bull/Redis)
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Monitoring</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  Prometheus + Grafana
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  ELK Stack for logs
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  Sentry for error tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  PagerDuty for alerts
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Backup Strategy</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-sky-500" />
                  Daily PostgreSQL backups (S3)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-sky-500" />
                  Point-in-time recovery enabled
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-sky-500" />
                  Cross-region replication
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-sky-500" />
                  Weekly backup restoration tests
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
