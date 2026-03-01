'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Rocket,
  Container,
  Cloud,
  GitBranch,
  Server,
  CheckCircle,
  RefreshCw,
  Activity,
  Cpu,
  HardDrive,
  Network,
  Brain,
  Music,
  Search,
  BookOpen,
  Users,
  Settings,
  Mic
} from 'lucide-react';

// Service definitions
const services = [
  { name: 'quran-service', port: 3001, icon: BookOpen, color: 'text-emerald-500', description: 'Surahs, Ayahs, Mushafs' },
  { name: 'audio-service', port: 3002, icon: Music, color: 'text-sky-500', description: 'Reciters, Recitations, Audio streaming' },
  { name: 'search-service', port: 3003, icon: Search, color: 'text-amber-500', description: 'Search, Elasticsearch integration' },
  { name: 'tafsir-service', port: 3004, icon: BookOpen, color: 'text-purple-500', description: 'Tafsir, Translations' },
  { name: 'users-service', port: 3005, icon: Users, color: 'text-pink-500', description: 'Auth, Users, Sessions' },
  { name: 'reciter-service', port: 3006, icon: Mic, color: 'text-indigo-500', description: 'Reciters management' },
  { name: 'ai-service', port: 3007, icon: Brain, color: 'text-rose-500', description: 'AI embeddings, LLM features' },
  { name: 'admin-service', port: 3008, icon: Settings, color: 'text-slate-500', description: 'Admin panel, database management' },
];

const dockerCompose = `# docker-compose.yml - Microservices Architecture
version: '3.8'

services:
  # Quran Service
  quran-service:
    build:
      context: ./services
      dockerfile: quran-service/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:/data/quran.db
    volumes:
      - ./db:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Audio Service
  audio-service:
    build:
      context: ./services
      dockerfile: audio-service/Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:/data/quran.db
    volumes:
      - ./db:/data

  # Search Service
  search-service:
    build:
      context: ./services
      dockerfile: search-service/Dockerfile
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:/data/quran.db
    volumes:
      - ./db:/data

  # Tafsir Service
  tafsir-service:
    build:
      context: ./services
      dockerfile: tafsir-service/Dockerfile
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:/data/quran.db
    volumes:
      - ./db:/data

  # Users Service
  users-service:
    build:
      context: ./services
      dockerfile: users-service/Dockerfile
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:/data/quran.db
      - JWT_SECRET=dev-jwt-secret-change-in-production
    volumes:
      - ./db:/data

  # Reciter Service
  reciter-service:
    build:
      context: ./services
      dockerfile: reciter-service/Dockerfile
    ports:
      - "3006:3006"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:/data/quran.db
    volumes:
      - ./db:/data

  # AI Service
  ai-service:
    build:
      context: ./services
      dockerfile: ai-service/Dockerfile
    ports:
      - "3007:3007"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:/data/quran.db
      - Z_AI_API_KEY=\${Z_AI_API_KEY}
    volumes:
      - ./db:/data

  # Admin Service
  admin-service:
    build:
      context: ./services
      dockerfile: admin-service/Dockerfile
    ports:
      - "3008:3008"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:/data/quran.db
    volumes:
      - ./db:/data
      - ./backups:/app/backups

  # Gateway (Caddy)
  gateway:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on:
      - quran-service
      - audio-service
      - search-service
      - ai-service
      - admin-service

networks:
  default:
    name: quran-network
`.trim();

const kubernetesNamespace = `# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: quran
  labels:
    app: quran-platform
    environment: production
`.trim();

const kubernetesConfigMap = `# k8s/configmaps/app-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: quran-config
  namespace: quran
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  DATABASE_URL: "file:/data/quran.db"
  # Service URLs
  QURAN_SERVICE_URL: "http://quran-service:3001"
  AUDIO_SERVICE_URL: "http://audio-service:3002"
  SEARCH_SERVICE_URL: "http://search-service:3003"
  TAFSIR_SERVICE_URL: "http://tafsir-service:3004"
  USERS_SERVICE_URL: "http://users-service:3005"
  RECITER_SERVICE_URL: "http://reciter-service:3006"
  AI_SERVICE_URL: "http://ai-service:3007"
  ADMIN_SERVICE_URL: "http://admin-service:3008"
`.trim();

const kubernetesDeployment = `# k8s/deployments/quran-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quran-service
  namespace: quran
  labels:
    app: quran-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: quran-service
  template:
    metadata:
      labels:
        app: quran-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: quran-service
        image: quran/quran-service:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3001
          name: http
        envFrom:
        - configMapRef:
            name: quran-config
        - secretRef:
            name: quran-secrets
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: quran-data-pvc
`.trim();

const kubernetesIngress = `# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: quran-ingress
  namespace: quran
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/use-regex: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.quran-app.com
    secretName: quran-tls
  rules:
  - host: api.quran-app.com
    http:
      paths:
      - path: /quran(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: quran-service
            port:
              number: 3001
      - path: /audio(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: audio-service
            port:
              number: 3002
      - path: /search(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: search-service
            port:
              number: 3003
      - path: /ai(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: ai-service
            port:
              number: 3007
`.trim();

const dockerfile = `# services/quran-service/Dockerfile
# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy shared first
COPY shared/package.json ./shared/
COPY quran-service/package.json ./quran-service/

# Install dependencies
WORKDIR /app/shared
RUN bun install
WORKDIR /app/quran-service
RUN bun install

# Copy source
COPY shared/ ../shared/
COPY quran-service/ .

# Build
RUN bun build src/index.ts --outdir dist

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/quran-service/dist ./dist
COPY --from=builder /app/quran-service/node_modules ./node_modules
COPY --from=builder /app/shared ../shared

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["bun", "run", "dist/index.js"]
`.trim();

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'not_running' | 'unknown';
  uptime?: number;
  version?: string;
  responseTime?: number;
  error?: string;
  port: number;
  description?: string;
  checks?: {
    database: boolean;
    cache?: boolean;
    external?: boolean;
  };
}

interface HealthCheckResponse {
  success: boolean;
  data: {
    summary: {
      total: number;
      healthy: number;
      unhealthy: number;
      notRunning: number;
      lastChecked: string;
    };
    services: ServiceStatus[];
  };
}

export function DeploymentSection() {
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>(
    services.map(s => ({ name: s.name, status: 'unknown' as const, port: s.port, description: s.description }))
  );
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ healthy: number; unhealthy: number; notRunning: number } | null>(null);

  const checkServicesHealth = async () => {
    setIsChecking(true);
    
    try {
      // Call the real API endpoint for health checks
      const response = await fetch('/api/admin/deployment/services-health');
      const data: HealthCheckResponse = await response.json();
      
      if (data.success && data.data) {
        setServiceStatuses(data.data.services);
        setLastChecked(data.data.summary.lastChecked);
        setSummary({
          healthy: data.data.summary.healthy,
          unhealthy: data.data.summary.unhealthy,
          notRunning: data.data.summary.notRunning,
        });
      }
    } catch (error) {
      console.error('Failed to check services health:', error);
      // Set all to unknown on error
      setServiceStatuses(
        services.map(s => ({ 
          name: s.name, 
          status: 'unknown' as const, 
          port: s.port, 
          description: s.description,
          error: 'Failed to check health'
        }))
      );
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Run health check on mount
    void checkServicesHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Microservices Deployment
              </CardTitle>
              <CardDescription>
                v1.6.0 - 8 independent services with shared SQLite database
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkServicesHealth}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-500/10">
              <Container className="h-5 w-5 text-sky-500" />
              <div>
                <p className="font-medium">8 Services</p>
                <p className="text-xs text-muted-foreground">Microservices</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
              <GitBranch className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Hono Framework</p>
                <p className="text-xs text-muted-foreground">Fast & lightweight</p>
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
                <p className="font-medium">Caddy Gateway</p>
                <p className="text-xs text-muted-foreground">Reverse proxy</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Services Status
              </CardTitle>
              <CardDescription>
                Real-time health status of all microservices
                {lastChecked && (
                  <span className="text-xs ml-2">
                    (Last checked: {new Date(lastChecked).toLocaleTimeString()})
                  </span>
                )}
              </CardDescription>
            </div>
            {summary && (
              <div className="flex gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-500">
                  {summary.healthy} Healthy
                </Badge>
                {summary.unhealthy > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-500">
                    {summary.unhealthy} Unhealthy
                  </Badge>
                )}
                {summary.notRunning > 0 && (
                  <Badge className="bg-red-500/10 text-red-500">
                    {summary.notRunning} Not Running
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {serviceStatuses.map((status, index) => {
              const service = services[index];
              const Icon = service.icon;
              const statusColor = 
                status.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' :
                status.status === 'unhealthy' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' :
                status.status === 'not_running' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' :
                'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20';
              
              return (
                <div
                  key={status.name}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className={`p-2 rounded-lg bg-muted ${service.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{status.name}</p>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColor}`}
                      >
                        {status.status === 'not_running' ? 'not running' : status.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      :{status.port} • {status.description || service.description}
                    </p>
                    {status.responseTime && (
                      <p className="text-xs text-muted-foreground">
                        {status.responseTime}ms
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Architecture Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Microservices Architecture</CardTitle>
          <CardDescription>
            Each service is independent and can be scaled separately
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-6 font-mono text-xs overflow-x-auto">
            <pre className="text-center">
{`                    ┌──────────────┐
                    │   Gateway    │
                    │   (Caddy)    │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐      ┌────▼────┐
   │ quran-  │       │  audio-   │      │ search- │
   │ service │       │  service  │      │ service │
   │  :3001  │       │   :3002   │      │  :3003  │
   └────┬────┘       └─────┬─────┘      └────┬────┘
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐      ┌────▼────┐
   │ tafsir- │       │  users-   │      │reciter- │
   │ service │       │  service  │      │ service │
   │  :3004  │       │   :3005   │      │  :3006  │
   └────┬────┘       └─────┬─────┘      └────┬────┘
        │                  │                  │
   ┌────▼────┐            │                  │
   │   ai-   │            │                  │
   │ service │            │                  │
   │  :3007  │            │                  │
   └────┬────┘            │                  │
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │   SQLite    │
                    │  (Shared)   │
                    └─────────────┘`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="docker" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="docker" className="flex items-center gap-2">
            <Container className="h-4 w-4" />
            Docker Compose
          </TabsTrigger>
          <TabsTrigger value="dockerfile" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Dockerfile
          </TabsTrigger>
          <TabsTrigger value="k8s-namespace" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            K8s Namespace
          </TabsTrigger>
          <TabsTrigger value="k8s-config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            K8s ConfigMap
          </TabsTrigger>
          <TabsTrigger value="k8s-deployment" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            K8s Deployment
          </TabsTrigger>
          <TabsTrigger value="k8s-ingress" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            K8s Ingress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="docker">
          <Card>
            <CardHeader>
              <CardTitle>Docker Compose - Microservices</CardTitle>
              <CardDescription>
                All 8 services + Caddy gateway for local development
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
              <CardTitle>Dockerfile (Example: quran-service)</CardTitle>
              <CardDescription>
                Multi-stage build with Bun runtime
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {dockerfile}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="k8s-namespace">
          <Card>
            <CardHeader>
              <CardTitle>Kubernetes Namespace</CardTitle>
              <CardDescription>
                Isolated environment for all services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {kubernetesNamespace}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="k8s-config">
          <Card>
            <CardHeader>
              <CardTitle>Kubernetes ConfigMap</CardTitle>
              <CardDescription>
                Shared configuration for all services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {kubernetesConfigMap}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="k8s-deployment">
          <Card>
            <CardHeader>
              <CardTitle>Kubernetes Deployment (Example: quran-service)</CardTitle>
              <CardDescription>
                Production deployment with health checks and resource limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {kubernetesDeployment}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="k8s-ingress">
          <Card>
            <CardHeader>
              <CardTitle>Kubernetes Ingress</CardTitle>
              <CardDescription>
                Route traffic to appropriate services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {kubernetesIngress}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service Details */}
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>
            Detailed information about each microservice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.name} className="flex items-start gap-3 p-4 rounded-lg border">
                  <div className={`p-2 rounded-lg bg-muted ${service.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{service.name}</p>
                      <Badge variant="outline" className="text-xs">:{service.port}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">Hono</Badge>
                      <Badge variant="secondary" className="text-xs">Bun</Badge>
                      <Badge variant="secondary" className="text-xs">TypeScript</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scaling & Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle>Scaling Strategy</CardTitle>
          <CardDescription>
            Each service can be scaled independently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-500" />
                Resource Management
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  CPU: 100m-500m per service
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Memory: 256Mi-512Mi per service
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Horizontal Pod Autoscaler
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Health Checks
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  /health endpoint
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Liveness probe
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Readiness probe
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-amber-500" />
                Shared Database
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  SQLite (development)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  Prisma ORM
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  42 tables
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
