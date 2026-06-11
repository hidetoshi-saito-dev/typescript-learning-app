import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // OAuth コールバックはクロール対象外（/login はクロール可・ページ側で noindex 指定）
      disallow: ['/auth/'],
    },
    sitemap: 'https://ts-tonari.app/sitemap.xml',
  }
}
