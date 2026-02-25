import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { User } from '@prisma/client';
import { requireAdmin } from '@/lib/auth/helpers';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  sizeRange: z.string().optional(),
  locationCountry: z.string().optional(),
  locationState: z.string().optional(),
  locationMetro: z.string().optional(),
  locationCity: z.string().optional(),
  emails: z.array(z.string().email('Invalid email address')).optional(),
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
  const rl = rateLimit(ip, { interval: 60_000, uniqueTokenPerInterval: 30 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  try {
    const validated = createOrganizationSchema.parse(body);

    // Create organization and users in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the organization
      const organization = await tx.organization.create({
        data: {
          name: validated.name,
          sizeRange: validated.sizeRange,
          locationCountry: validated.locationCountry,
          locationState: validated.locationState,
          locationMetro: validated.locationMetro,
          locationCity: validated.locationCity,
        },
      });

      // Create users if emails were provided
      let users: User[] = [];
      if (validated.emails && validated.emails.length > 0) {
        // Check for existing emails
        const existingUsers = await tx.user.findMany({
          where: {
            email: {
              in: validated.emails,
            },
          },
          select: {
            email: true,
          },
        });

        const existingEmails = existingUsers.map((u) => u.email);
        const newEmails = validated.emails.filter(
          (email) => !existingEmails.includes(email)
        );

        // Create new users
        if (newEmails.length > 0) {
          await tx.user.createMany({
            data: newEmails.map((email) => ({
              email,
              role: 'RESPONDENT',
              organizationId: organization.id,
            })),
          });

          // Fetch created users for response
          users = await tx.user.findMany({
            where: {
              organizationId: organization.id,
            },
          });
        }

        // Return info about duplicates if any
        if (existingEmails.length > 0) {
          return {
            organization,
            users,
            duplicates: existingEmails,
          };
        }
      }

      return {
        organization,
        users,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const organizations = await prisma.organization.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            users: true,
            campaigns: true,
          },
        },
      },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch organizations',
      },
      { status: 500 }
    );
  }
}
