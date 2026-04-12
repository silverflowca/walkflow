import type { Context, Next } from 'hono'
import { createClient } from '@supabase/supabase-js'

const url     = process.env.SUPABASE_URL      ?? 'http://localhost:55321'
const anonKey = process.env.SUPABASE_ANON_KEY ?? ''

export async function requireAuth(c: Context, next: Next) {
  // Dev bypass
  if (process.env.NO_AUTH === 'true') {
    c.set('userId', 'dev-user')
    return next()
  }

  const authHeader = c.req.header('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }

  const token  = authHeader.slice(7)
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth:   { persistSession: false },
  })

  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) {
    return c.json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' }, 401)
  }

  c.set('userId', user.id)
  await next()
}
