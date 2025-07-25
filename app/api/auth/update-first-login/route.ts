import { updateFirstLoginStatus } from '@/utils/dataStore';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    updateFirstLoginStatus();
    return NextResponse.json({ message: 'First login status updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Error updating first login status' }, { status: 500 });
  }
}