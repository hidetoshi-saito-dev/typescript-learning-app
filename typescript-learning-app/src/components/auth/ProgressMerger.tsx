'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clearGuestProgress, getGuestSnapshot } from '@/lib/progress/guest'
import { mergeGuestProgress } from '@/lib/progress/actions'

export function ProgressMerger() {
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      const completed = getGuestSnapshot()
      if (completed.size === 0) return

      mergeGuestProgress([...completed]).then(() => {
        clearGuestProgress()
      })
    })
  }, [])

  return null
}
