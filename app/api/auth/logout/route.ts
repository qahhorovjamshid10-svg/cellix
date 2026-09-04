import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  await deleteSession(response)
  return response
}
