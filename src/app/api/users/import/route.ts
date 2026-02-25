import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/helpers';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ImportUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['RESPONDENT', 'VIEWER', 'ORG_ADMIN', 'SUPER_ADMIN']).default('RESPONDENT'),
  organizationId: z.string().min(1),
});

const ImportBodySchema = z.object({
  users: z.array(ImportUserSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = rateLimit(ip, { interval: 60_000, uniqueTokenPerInterval: 10 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  try {
    const parsed = ImportBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { users } = parsed.data;

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name || null,
            organizationId: user.organizationId,
          },
          create: {
            email: user.email,
            name: user.name || null,
            role: user.role,
            organizationId: user.organizationId,
            isActive: true,
          },
        });
        success++;
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${user.email}: ${msg}`);
      }
    }

    return NextResponse.json({ success, failed, errors });
  } catch (error) {
    console.error('Failed to import users:', error);
    return NextResponse.json({ error: 'Failed to import users' }, { status: 500 });
  }
}
