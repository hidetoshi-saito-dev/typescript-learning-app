import type { MetadataRoute } from 'next'
import { getCatalogList } from '@/lib/lessons/catalog'

const BASE_URL = 'https://ts-tonari.app'

// ゲスト（未ログイン）が直接閲覧できる URL のみを載せる。
// レッスン 004 以降は middleware が /login へ 307 するため、クローラには到達不能。
export default function sitemap(): MetadataRoute.Sitemap {
  const guestLessons = getCatalogList().filter((lesson) => parseInt(lesson.id, 10) < 4)

  return [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1 },
    ...guestLessons.map((lesson) => ({
      url: `${BASE_URL}/lessons/${lesson.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
