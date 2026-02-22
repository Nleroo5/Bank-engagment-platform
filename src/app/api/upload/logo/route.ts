import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: JPG, PNG, WebP.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2 MB.' },
        { status: 400 }
      );
    }

    // Derive extension from MIME type (not filename) to prevent spoofing
    const MIME_TO_EXT: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = MIME_TO_EXT[file.type] ?? 'png';
    const safeName = `logos/${Date.now()}-splash.${ext}`;

    const blob = await put(safeName, file, { access: 'public' });

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo. Please try again.' },
      { status: 500 }
    );
  }
}
