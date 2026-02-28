'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield,
  Lock,
  Key,
  Eye,
  FileCheck,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const securityMeasures = {
  authentication: {
    title: 'Authentication & Authorization',
    items: [
      { name: 'JWT Tokens', description: 'Short-lived access tokens (1 hour) with refresh token rotation', implemented: true },
      { name: 'Password Hashing', description: 'Argon2id with salt for password storage', implemented: true },
      { name: 'Rate Limiting', description: '100 requests/minute per IP, stricter for auth endpoints', implemented: true },
      { name: 'Session Management', description: 'Device tracking with ability to revoke sessions', implemented: true },
      { name: 'Email Verification', description: 'Required for new accounts before full access', implemented: true },
      { name: '2FA Support', description: 'TOTP-based two-factor authentication (optional)', implemented: false },
    ]
  },
  dataProtection: {
    title: 'Data Protection',
    items: [
      { name: 'HTTPS Only', description: 'TLS 1.3 enforced on all endpoints', implemented: true },
      { name: 'Input Validation', description: 'Zod schemas with strict type checking', implemented: true },
      { name: 'SQL Injection Prevention', description: 'Prisma ORM with parameterized queries', implemented: true },
      { name: 'XSS Protection', description: 'Content Security Policy, input sanitization', implemented: true },
      { name: 'CSRF Protection', description: 'Double-submit cookie pattern for state-changing operations', implemented: true },
      { name: 'Sensitive Data Encryption', description: 'AES-256 for stored sensitive data', implemented: true },
    ]
  },
  apiSecurity: {
    title: 'API Security',
    items: [
      { name: 'API Key Rotation', description: 'Monthly rotation for service-to-service keys', implemented: true },
      { name: 'Request Signing', description: 'HMAC signatures for critical operations', implemented: true },
      { name: 'IP Whitelisting', description: 'Admin endpoints restricted to known IPs', implemented: true },
      { name: 'Request Logging', description: 'Full audit trail with sensitive data redacted', implemented: true },
      { name: 'Content Type Validation', description: 'Strict content-type checking on all requests', implemented: true },
      { name: 'Request Size Limits', description: 'Configurable limits per endpoint', implemented: true },
    ]
  },
  mobileSecurity: {
    title: 'Mobile App Security',
    items: [
      { name: 'Secure Storage', description: 'EncryptedSharedPreferences for tokens (Android)', implemented: true },
      { name: 'Certificate Pinning', description: 'SSL certificate pinning for API calls', implemented: true },
      { name: 'Root Detection', description: 'Warning and limited functionality on rooted devices', implemented: true },
      { name: 'Code Obfuscation', description: 'R8/ProGuard for production builds', implemented: true },
      { name: 'Anti-tampering', description: 'Signature verification on app startup', implemented: true },
      { name: 'Network Security Config', description: 'Cleartext traffic disabled', implemented: true },
    ]
  }
};

const codeExamples = {
  inputValidation: `// Zod validation schema
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(100),
});

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  name: z.string().min(2).max(100),
});

export const bookmarkSchema = z.object({
  ayahId: z.number().int().positive(),
  type: z.enum(['BOOKMARK', 'HIGHLIGHT', 'NOTE']),
  note: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});`,

  rateLimiter: `// rate-limiter.ts
import { NextRequest, NextResponse } from 'next/server';

const rateLimits = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  request: NextRequest,
  options: { windowMs?: number; maxRequests?: number } = {}
): NextResponse | null {
  const { windowMs = 60000, maxRequests = 100 } = options;
  
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = \`\${ip}:\${request.nextUrl.pathname}\`;
  const now = Date.now();
  
  const limit = rateLimits.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return null;
  }
  
  if (limit.count >= maxRequests) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  limit.count++;
  return null;
}

// Usage in API route
export async function GET(request: NextRequest) {
  const rateLimitError = rateLimit(request, { maxRequests: 50 });
  if (rateLimitError) return rateLimitError;
  
  // Continue with request handling
}`,

  secureUpload: `// secure-upload.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'audio/mpeg': ['.mp3'],
  'audio/mp3': ['.mp3'],
  'audio/mp4': ['.m4a'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function handleSecureUpload(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  
  // 1. Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }
  
  // 2. Validate MIME type
  const allowedExtensions = ALLOWED_MIME_TYPES[file.type];
  if (!allowedExtensions) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }
  
  // 3. Generate secure filename
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.randomBytes(16).toString('hex');
  const ext = allowedExtensions[0];
  const secureFilename = \`\${hash}\${ext}\`;
  
  // 4. Save to secure location
  const uploadDir = join(process.cwd(), 'uploads', 'secure');
  await writeFile(join(uploadDir, secureFilename), buffer);
  
  return NextResponse.json({ 
    success: true, 
    filename: secureFilename 
  });
}`,

  androidSecureStorage: `// SecureTokenStorage.kt
import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureTokenStorage(context: Context) {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        "secure_auth_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveTokens(accessToken: String, refreshToken: String) {
        encryptedPrefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putLong(KEY_TOKEN_TIMESTAMP, System.currentTimeMillis())
            .apply()
    }

    fun getAccessToken(): String? {
        return encryptedPrefs.getString(KEY_ACCESS_TOKEN, null)
    }

    fun getRefreshToken(): String? {
        return encryptedPrefs.getString(KEY_REFRESH_TOKEN, null)
    }

    fun clearTokens() {
        encryptedPrefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_TOKEN_TIMESTAMP = "token_timestamp"
    }
}

// Network Security Config (res/xml/network_security_config.xml)
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.quran.app</domain>
        <pin-set>
            <pin digest="SHA-256">base64EncodedPin1=</pin>
            <pin digest="SHA-256">base64EncodedPin2=</pin>
        </pin-set>
    </domain-config>
</network-security-config>`
};

export function SecuritySection() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Implementation
          </CardTitle>
          <CardDescription>
            Comprehensive security measures for production deployment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10">
              <Lock className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-medium">Authentication</p>
                <p className="text-xs text-muted-foreground">JWT + 2FA ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Encryption</p>
                <p className="text-xs text-muted-foreground">AES-256 / TLS 1.3</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10">
              <Eye className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Monitoring</p>
                <p className="text-xs text-muted-foreground">Audit logs + alerts</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-500/10">
              <FileCheck className="h-5 w-5 text-sky-500" />
              <div>
                <p className="font-medium">Validation</p>
                <p className="text-xs text-muted-foreground">Input sanitization</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Measures */}
      <Tabs defaultValue="auth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="data">Data Protection</TabsTrigger>
          <TabsTrigger value="api">API Security</TabsTrigger>
          <TabsTrigger value="mobile">Mobile Security</TabsTrigger>
        </TabsList>

        {Object.entries(securityMeasures).map(([key, section]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>
                  Security measures implemented in the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {section.items.map((item) => (
                    <div key={item.name} className="flex items-start justify-between py-3 border-b last:border-0">
                      <div className="flex items-start gap-3">
                        {item.implemented ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <Badge variant={item.implemented ? 'default' : 'secondary'}>
                        {item.implemented ? 'Implemented' : 'Planned'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Security Code Examples</CardTitle>
          <CardDescription>
            Implementation examples for key security measures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="validation">
            <TabsList>
              <TabsTrigger value="validation">Input Validation</TabsTrigger>
              <TabsTrigger value="rateLimit">Rate Limiting</TabsTrigger>
              <TabsTrigger value="upload">Secure Upload</TabsTrigger>
              <TabsTrigger value="android">Android Storage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="validation" className="mt-4">
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {codeExamples.inputValidation}
              </pre>
            </TabsContent>
            
            <TabsContent value="rateLimit" className="mt-4">
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {codeExamples.rateLimiter}
              </pre>
            </TabsContent>
            
            <TabsContent value="upload" className="mt-4">
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {codeExamples.secureUpload}
              </pre>
            </TabsContent>
            
            <TabsContent value="android" className="mt-4">
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {codeExamples.androidSecureStorage}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
