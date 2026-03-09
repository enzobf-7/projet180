import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TEST_EMAIL =
  process.env.SEED_TEST_USER_EMAIL || 'demo+glc-client@example.com'

export async function POST() {
  if (process.env.NEXT_PUBLIC_SEED_TEST_USER !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = createAdminClient()

  // Get user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const user = users.find(u => u.email === TEST_EMAIL)
  if (!user) {
    return NextResponse.json({ error: 'Test user not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('onboarding_progress')
    .upsert({
      client_id: user.id,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok', client_id: user.id })
}
