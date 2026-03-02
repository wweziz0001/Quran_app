import { NextRequest, NextResponse } from 'next/server';

// Microservices configuration
const services = [
  { name: 'quran-service', port: 3001, description: 'Surahs, Ayahs, Mushafs' },
  { name: 'audio-service', port: 3002, description: 'Reciters, Recitations, Audio streaming' },
  { name: 'search-service', port: 3003, description: 'Search, Elasticsearch integration' },
  { name: 'tafsir-service', port: 3004, description: 'Tafsir, Translations' },
  { name: 'users-service', port: 3005, description: 'Auth, Users, Sessions' },
  { name: 'reciter-service', port: 3006, description: 'Reciters management' },
  { name: 'ai-service', port: 3007, description: 'AI embeddings, LLM features' },
  { name: 'admin-service', port: 3008, description: 'Admin panel, database management' },
];

interface ServiceHealth {
  name: string;
  port: number;
  description: string;
  status: 'healthy' | 'unhealthy' | 'not_running';
  uptime?: number;
  version?: string;
  timestamp?: string;
  checks?: {
    database: boolean;
    cache?: boolean;
    external?: boolean;
  };
  responseTime?: number;
  error?: string;
}

async function checkServiceHealth(service: typeof services[0]): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Connect directly to microservice (bypass gateway for server-side calls)
    const response = await fetch(`http://localhost:${service.port}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      try {
        const data = await response.json();
        return {
          name: service.name,
          port: service.port,
          description: service.description,
          status: 'healthy',
          uptime: data.uptime,
          version: data.version,
          timestamp: data.timestamp,
          checks: data.checks,
          responseTime,
        };
      } catch {
        // Service responded but not with JSON
        return {
          name: service.name,
          port: service.port,
          description: service.description,
          status: 'healthy',
          responseTime,
        };
      }
    } else {
      return {
        name: service.name,
        port: service.port,
        description: service.description,
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      name: service.name,
      port: service.port,
      description: service.description,
      status: 'not_running',
      responseTime,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceName = searchParams.get('service');
  
  // If specific service requested
  if (serviceName) {
    const service = services.find(s => s.name === serviceName);
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }
    
    const health = await checkServiceHealth(service);
    return NextResponse.json({ success: true, data: health });
  }
  
  // Check all services in parallel
  const healthChecks = await Promise.all(
    services.map(service => checkServiceHealth(service))
  );
  
  // Calculate summary
  const summary = {
    total: services.length,
    healthy: healthChecks.filter(h => h.status === 'healthy').length,
    unhealthy: healthChecks.filter(h => h.status === 'unhealthy').length,
    notRunning: healthChecks.filter(h => h.status === 'not_running').length,
    lastChecked: new Date().toISOString(),
  };
  
  return NextResponse.json({
    success: true,
    data: {
      summary,
      services: healthChecks,
    },
  });
}

// Start/Stop service (for future use)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, service: serviceName } = body;
  
  const service = services.find(s => s.name === serviceName);
  if (!service) {
    return NextResponse.json(
      { success: false, error: 'Service not found' },
      { status: 404 }
    );
  }
  
  // In production, this would interact with Kubernetes or Docker
  // For now, return a placeholder response
  return NextResponse.json({
    success: false,
    error: 'Service management requires Kubernetes or Docker runtime',
    hint: 'Use docker-compose or kubectl to manage services',
  });
}
