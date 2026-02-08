import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const importUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  division: z.string().optional(),
  jobRole: z.string().optional(),
  organizationId: z.string().uuid(),
  role: z.enum(['SUPER_ADMIN', 'ORG_ADMIN', 'VIEWER', 'RESPONDENT']).default('RESPONDENT'),
});

const importSchema = z.object({
  users: z.array(importUserSchema),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { users } = importSchema.parse(body);

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No users to import' },
        { status: 400 }
      );
    }

    if (users.length > 1000) {
      return NextResponse.json(
        { error: 'Cannot import more than 1000 users at once' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each user
    for (let i = 0; i < users.length; i++) {
      const userData = users[i];

      if (!userData) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Invalid user data`);
        continue;
      }

      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email },
        });

        if (existingUser) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: User with email ${userData.email} already exists`
          );
          continue;
        }

        // Verify organization exists
        const organization = await prisma.organization.findUnique({
          where: { id: userData.organizationId },
        });

        if (!organization) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Organization not found for ${userData.email}`
          );
          continue;
        }

        // Create the user
        await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name || null,
            role: userData.role,
            organizationId: userData.organizationId,
            division: userData.division || null,
            jobRole: userData.jobRole || null,
            isActive: true,
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error importing users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
