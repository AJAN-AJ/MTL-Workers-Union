import { cookies } from 'next/headers'
import { readSession, SessionPayload } from '@/lib/auth'

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return readSession(token)
}