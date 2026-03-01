import { db } from '@/lib/db';
import { compare, hash } from 'crypto';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'EDITOR' | 'ADMIN';
  avatarUrl: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hashedPassword;
}

export function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'quran-app-secret-key';
  const payload = JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return Buffer.from(`${payload}.${secret}`).toString('base64');
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const secret = process.env.JWT_SECRET || 'quran-app-secret-key';
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [payload, secretPart] = decoded.split('.');
    if (secretPart !== secret) return null;
    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = verifyToken(token);
  if (!payload) return null;
  
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
    },
  });
  
  return user;
}
