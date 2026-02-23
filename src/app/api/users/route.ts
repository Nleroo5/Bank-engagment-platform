import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['RESPONDENT', 'VIEWER', 'ORG_ADMIN', 'SUPER_ADMIN']).default('RESPONDENT'),
  organizationId: z.string().min(1),
  isActive: z.boolean().default(true),
});

export async function GET(_request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Never expose passwordHash
    const safe = users.map(({ passwordHash: _ph, ...u }) => u);
    return NextResponse.json(safe);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name, password, role, organizationId, isActive } = parsed.data;

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        role,
        organizationId,
        isActive,
      },
      include: { organization: true },
    });

    const { passwordHash: _ph, ...safe } = user;
    return NextResponse.json(safe, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
