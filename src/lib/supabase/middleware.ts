import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Admin client for routing queries — bypasses RLS (which has infinite recursion
// on the profiles table when the admin policy queries profiles itself)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Not logged in → redirect to login
  if (!user && path !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Logged in → redirect from login to appropriate page
  if (user && path === '/') {
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()

    if (profile?.role === 'admin') {
      url.pathname = '/admin'
    } else {
      const { data: onboarding } = await admin
        .from('onboarding_progress')
        .select('completed_at')
        .eq('user_id', user.id)
        .single()

      if (!onboarding?.completed_at) {
        url.pathname = '/onboarding'
      } else if (!user.user_metadata?.password_changed) {
        url.pathname = '/set-password'
      } else {
        url.pathname = '/dashboard'
      }
    }

    return NextResponse.redirect(url)
  }

  // Block clients who haven't set password from accessing app pages
  if (user && !path.startsWith('/admin') && path !== '/set-password' && path !== '/onboarding' && path !== '/') {
    const needsPassword = user.user_metadata?.role === 'client' && !user.user_metadata?.password_changed
    if (needsPassword) {
      const admin = createAdminClient()
      const { data: onboarding } = await admin
        .from('onboarding_progress')
        .select('completed_at')
        .eq('user_id', user.id)
        .single()
      if (onboarding?.completed_at) {
        const url = request.nextUrl.clone()
        url.pathname = '/set-password'
        return NextResponse.redirect(url)
      }
    }
  }

  // Redirect away from /set-password if already changed
  if (user && path === '/set-password' && user.user_metadata?.password_changed) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Block clients from admin routes
  if (user && path.startsWith('/admin')) {
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
