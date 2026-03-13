import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/todos?clientId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  }

  // Verify caller is admin
  const { createClient } = await import('@/lib/supabase/server')
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { data, error } = await supabase
    .from('todos')
    .select('id, client_id, title, is_system, completed_date, created_at')
    .eq('client_id', clientId)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ todos: data ?? [] })
}

// POST /api/admin/todos — add custom todo for a client
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { client_id, title } = body

  if (!client_id || !title?.trim()) {
    return NextResponse.json({ error: 'client_id and title required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('todos')
    .insert({ client_id, title: title.trim(), is_system: false })
    .select('id, client_id, title, is_system, completed_date, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ todo: data })
}

// DELETE /api/admin/todos?id=xxx — delete non-system todo only
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Safety: refuse to delete system todos
  const { data: existing } = await supabase
    .from('todos')
    .select('is_system')
    .eq('id', id)
    .single()

  if (existing?.is_system) {
    return NextResponse.json({ error: 'Cannot delete system todos' }, { status: 403 })
  }

  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
