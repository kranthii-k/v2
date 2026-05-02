import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${safeName}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const uploadPath = join(uploadDir, fileName);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(uploadPath, buffer);

    return NextResponse.json({
      hash: `/uploads/${fileName}`,
      url: `/uploads/${fileName}`,
      fileName,
    });
  } catch (error) {
    console.error('Receipt upload failed:', error);
    return NextResponse.json({ error: 'Receipt upload failed' }, { status: 500 });
  }
}
