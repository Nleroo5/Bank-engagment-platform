import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(request: NextRequest) {
  // Fail fast with a clear message if the Blob token is not configured.
  // Without it, @vercel/blob will throw a generic error that is hard to diagnose.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[upload/logo] BLOB_READ_WRITE_TOKEN is not set. Logo uploads require a Vercel Blob store to be connected to this project.');
    return NextResponse.json(
      { error: 'Logo storage is not configured on this server. Ask your administrator to connect a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.' },
      { status: 503 }
    );
  }

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
        { error: 'File too large. Maximum size is 4 MB.' },
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
    const message = error instanceof Error ? error.message : String(error);
    console.error('[upload/logo] Upload failed:', message, error);
    return NextResponse.json(
      { error: `Logo upload failed: ${message}` },
      { status: 500 }
    );
  }
}
