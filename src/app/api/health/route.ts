import { NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: (error as Error).message }, { status: 500 });
  }
}
