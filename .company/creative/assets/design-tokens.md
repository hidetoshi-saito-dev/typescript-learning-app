---
created: "2026-05-26"
status: approved
---

# デザイントークン

TypeScript定数として書き出し可能な形で定義。
実装時は `src/styles/tokens.ts` に配置し `as const` でインポートする。

---

## カラー

```typescript
export const colors = {
  // ブランド（TypeScript公式青）
  brand:       '#3178C6',
  brandDark:   '#1A56A0',
  brandLight:  '#60A5FA',

  // セマンティック
  success: '#22C55E',
  error:   '#EF4444',
  warning: '#F59E0B',
  info:    '#38BDF8',

  // エディタ（ダーク）
  bgEditor:      '#0F172A',  // Slate-900
  surfaceEditor: '#1E293B',  // Slate-800
  borderEditor:  '#334155',  // Slate-700
  textEditor:    '#F1F5F9',  // Slate-100
  textMuted:     '#94A3B8',  // Slate-400

  // コンテンツ（ライト）
  bgContent:     '#F8FAFC',  // Slate-50
  surfaceCard:   '#FFFFFF',
  borderUi:      '#E2E8F0',  // Slate-200
  textBody:      '#1E293B',  // Slate-800
  textSecondary: '#64748B',  // Slate-500
} as const
```

---

## タイポグラフィ

```typescript
export const fonts = {
  code: "'JetBrains Mono', 'Fira Code', monospace",
  body: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
} as const

export const fontSize = {
  xs:   '0.75rem',   // 12px  行番号・チップ
  sm:   '0.875rem',  // 14px  エラーパネル・補足
  base: '1rem',      // 16px  問題文本文
  lg:   '1.125rem',  // 18px  セクション見出し
  xl:   '1.25rem',   // 20px  レッスンタイトル
  '2xl':'1.5rem',    // 24px  コース名
  '3xl':'1.875rem',  // 30px  ヒーロー見出し
} as const

export const fontWeight = {
  normal:   400,
  medium:   500,
  semibold: 600,
  bold:     700,
} as const
```

---

## スペーシング（4pxグリッド）

```typescript
export const spacing = {
  1:  '0.25rem',  // 4px
  2:  '0.5rem',   // 8px
  3:  '0.75rem',  // 12px
  4:  '1rem',     // 16px
  6:  '1.5rem',   // 24px
  8:  '2rem',     // 32px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
} as const
```

---

## ボーダー半径

```typescript
export const borderRadius = {
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  full: '9999px',
} as const
```

---

## ブレークポイント

```typescript
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const
```
