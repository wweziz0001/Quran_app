'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  Server, 
  Database, 
  Cloud, 
  Zap,
  ArrowRight,
  CheckCircle,
  Layers
} from 'lucide-react';

export function ArchitectureSection() {
  const architectureLayers = [
    {
      name: 'Mobile Client',
      icon: Smartphone,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      description: 'Kotlin + Jetpack Compose Android Application',
      technologies: [
        'Kotlin 1.9+',
        'Jetpack Compose',
        'MVVM + Clean Architecture',
        'Hilt DI',
        'Retrofit + OkHttp',
        'Room Database',
        'ExoPlayer',
        'Coil'
      ],
      features: [
        'Offline-first with local caching',
        'Reactive UI with StateFlow',
        'Audio streaming & download',
        'RTL Arabic support',
        'Dark/Light themes',
        'Material Design 3'
      ]
    },
    {
      name: 'API Gateway',
      icon: Server,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'NestJS Backend API Server',
      technologies: [
        'NestJS 10',
        'TypeScript 5',
        'Prisma ORM',
        'JWT + Passport',
        'class-validator',
        'Swagger/OpenAPI',
        'Bull Queue',
        'Socket.io'
      ],
      features: [
        'RESTful API design',
        'JWT authentication',
        'Role-based access control',
        'Rate limiting',
        'Request validation',
        'API documentation',
        'Background jobs'
      ]
    },
    {
      name: 'Data Layer',
      icon: Database,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      description: 'PostgreSQL + Redis Caching',
      technologies: [
        'PostgreSQL 16',
        'Redis 7.x',
        'Prisma Migrate',
        'Connection pooling',
        'Read replicas',
        'Full-text search'
      ],
      features: [
        'Normalized schema',
        'Index optimization',
        'Query caching',
        'Session management',
        'Rate limit storage',
        'Data migrations'
      ]
    },
    {
      name: 'Storage & CDN',
      icon: Cloud,
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      description: 'S3 + CloudFront for audio delivery',
      technologies: [
        'AWS S3',
        'CloudFront CDN',
        'Presigned URLs',
        'Multi-region',
        'Edge caching'
      ],
      features: [
        'Audio file storage',
        'Image assets',
        'Fast global delivery',
        'Signed URLs',
        'Automatic backups'
      ]
    }
  ];

  const dataFlowSteps = [
    { step: 1, action: 'User opens app', component: 'Mobile App', detail: 'Checks local cache for data' },
    { step: 2, action: 'API Request', component: 'API Gateway', detail: 'Authenticates & validates request' },
    { step: 3, action: 'Cache Check', component: 'Redis', detail: 'Returns cached data if available' },
    { step: 4, action: 'Database Query', component: 'PostgreSQL', detail: 'Fetches data if cache miss' },
    { step: 5, action: 'Audio Stream', component: 'CDN', detail: 'Delivers audio via CloudFront' },
    { step: 6, action: 'Response', component: 'Mobile App', detail: 'Updates UI & local cache' },
  ];

  return (
    <div className="space-y-6">
      {/* High-Level Architecture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            High-Level Architecture
          </CardTitle>
          <CardDescription>
            Production-grade architecture designed for 50,000 - 500,000 users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {architectureLayers.map((layer, index) => {
              const Icon = layer.icon;
              return (
                <div key={index} className="space-y-3">
                  <div className={`flex items-center gap-3 p-4 rounded-lg ${layer.bgColor}`}>
                    <Icon className={`h-8 w-8 ${layer.color}`} />
                    <div>
                      <h3 className="font-semibold">{layer.name}</h3>
                      <p className="text-xs text-muted-foreground">{layer.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Technologies:</p>
                    <div className="flex flex-wrap gap-1">
                      {layer.technologies.map((tech, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Data Flow Diagram</CardTitle>
          <CardDescription>How data moves through the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dataFlowSteps.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {item.step}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Badge variant="outline">{item.component}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.action}</span>
                </div>
                <span className="text-xs text-muted-foreground">{item.detail}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="mobile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mobile">Mobile App</TabsTrigger>
          <TabsTrigger value="backend">Backend API</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
        </TabsList>

        <TabsContent value="mobile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Android Application Architecture
              </CardTitle>
              <CardDescription>
                Clean Architecture with MVVM pattern
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Presentation Layer</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Jetpack Compose UI</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> ViewModels</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> StateFlow/LiveData</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Navigation Compose</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Material Design 3</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Domain Layer</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Use Cases</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Repository Interfaces</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Domain Models</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Business Logic</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Data Layer</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Repository Implementations</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Retrofit API Service</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Room Database</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> DataStore Prefs</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> ExoPlayer Audio</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                NestJS Backend Architecture
              </CardTitle>
              <CardDescription>
                Modular, scalable API server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Core Modules</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> AuthModule (JWT, Passport)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> QuranModule (Surahs, Ayahs)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> RecitationModule (Audio)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> TafsirModule (Commentary)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> UserModule (Profiles)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> AdminModule (CRUD)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Infrastructure</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> PrismaService (Database)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> RedisService (Caching)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> S3Service (Storage)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> QueueService (Background Jobs)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> LoggerService (Logging)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Design Principles
              </CardTitle>
              <CardDescription>
                Optimized PostgreSQL schema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Schema Design</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Normalized to 3NF</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Proper indexing strategy</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Foreign key constraints</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Cascade delete rules</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Full-text search on Ayahs</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Performance</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Connection pooling (PgBouncer)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Redis caching layer</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Query optimization</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Read replicas for scaling</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Deployment Strategy
              </CardTitle>
              <CardDescription>
                Docker + Kubernetes for scalability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Containerization</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Multi-stage Docker builds</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Docker Compose for dev</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Kubernetes for production</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Horizontal Pod Autoscaling</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Rolling deployments</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">CI/CD Pipeline</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> GitHub Actions</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Automated testing</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Docker image builds</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Staging environment</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Production deployment</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
