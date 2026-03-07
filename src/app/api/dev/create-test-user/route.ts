import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TEST_EMAIL =
  process.env.SEED_TEST_USER_EMAIL || 'demo+glc-client@example.com'
const TEST_PASSWORD =
  process.env.SEED_TEST_USER_PASSWORD || 'DemoClient123!'

export async function POST() {
  if (process.env.NEXT_PUBLIC_SEED_TEST_USER !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: 'Client',
      last_name: 'Démo',
      role: 'client',
    },
  })

  if (error && !error.message.includes('already been registered')) {
    console.error('Error creating test user:', error)
    return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 })
  }

  return NextResponse.json({
    status: error ? 'existing' : 'created',
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
}

