'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function toggleHabitAction(habitId: string, completing: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  if (completing) {
    await admin.from('habit_logs').upsert(
      { client_id: user.id, habit_id: habitId, date: today, completed: true },
      { onConflict: 'habit_id,date' }
    )
  } else {
    await admin
      .from('habit_logs')
      .delete()
      .eq('client_id', user.id)
      .eq('habit_id', habitId)
      .eq('date', today)
  }

  revalidatePath('/dashboard')
}
