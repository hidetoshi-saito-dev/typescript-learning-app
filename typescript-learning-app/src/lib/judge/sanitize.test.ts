// sanitize.test.ts — ②型構文チェック用サニタイザの境界固定テスト
//
// 観点は「チート答案のキーワードが structure から消えること」と
// 「正当なコードのキーワード・改行が structure に残ること」の両面。
// バイパス封鎖の経緯は .company/engineering/docs/2026-06-09-judge-false-positive.md を参照。

import { describe, expect, it } from 'vitest'
import { sanitizeForChecks } from './sanitize'

// ②の実レッスンと同形の判定regex（021-partial-required の例）
const PARTIAL_CHECK = /Partial[ \t]*</

describe('sanitizeForChecks: 正当なコードを壊さない', () => {
  it('実コードの型キーワードは structure に残る', () => {
    const { structure } = sanitizeForChecks('function f(patch: Partial<User>) {}')
    expect(structure).toMatch(PARTIAL_CHECK)
  })

  it('改行数を保つ（エラー行番号の維持）', () => {
    const src = 'const a = 1\n// comment\nconst b = "text"\n'
    const { structure, noComments } = sanitizeForChecks(src)
    expect(structure.split('\n')).toHaveLength(src.split('\n').length)
    expect(noComments.split('\n')).toHaveLength(src.split('\n').length)
  })

  it('識別子の後の / は除算として保持される', () => {
    const { structure } = sanitizeForChecks('const half = total / 2\nconst quarter = total / 4')
    expect(structure).toContain('total / 2')
    expect(structure).toContain('total / 4')
  })

  it(') や数値の後の / も除算として保持される', () => {
    const { structure } = sanitizeForChecks('const x = (a + b) / 2\nconst y = 10 / 5')
    expect(structure).toContain('(a + b) / 2')
    expect(structure).toContain('10 / 5')
  })
})

describe('sanitizeForChecks: コメント・文字列バイパス（2026-06-09 封鎖）', () => {
  it('行コメント内のキーワードは空白化される', () => {
    const { structure, noComments } = sanitizeForChecks('// Partial<User>\nconst a = 1')
    expect(structure).not.toMatch(PARTIAL_CHECK)
    expect(noComments).not.toMatch(PARTIAL_CHECK)
  })

  it('ブロックコメント内のキーワードは空白化される（複数行でも改行は保持）', () => {
    const src = '/*\n Partial<User>\n*/\nconst a = 1'
    const { structure } = sanitizeForChecks(src)
    expect(structure).not.toMatch(PARTIAL_CHECK)
    expect(structure.split('\n')).toHaveLength(src.split('\n').length)
  })

  it('文字列リテラル内のキーワードは structure から消え、noComments には残る', () => {
    const { structure, noComments } = sanitizeForChecks('const s = "Partial<User>"')
    expect(structure).not.toMatch(PARTIAL_CHECK)
    expect(structure).toContain('"') // デリミタは保持
    expect(noComments).toContain('Partial<User>') // リテラル値検査レッスン向けに保持
  })

  it('置換なしテンプレートも文字列と同じ扱い', () => {
    const { structure, noComments } = sanitizeForChecks('const s = `Partial<User>`')
    expect(structure).not.toMatch(PARTIAL_CHECK)
    expect(noComments).toContain('Partial<User>')
  })
})

describe('sanitizeForChecks: テンプレート置換バイパス（2026-06-11 封鎖）', () => {
  it('TemplateHead/Tail のテキスト部は空白化される', () => {
    const { structure, noComments } = sanitizeForChecks('const t = `Partial<User>${0}`')
    expect(structure).not.toMatch(PARTIAL_CHECK)
    expect(noComments).toContain('Partial<User>')
  })

  it('TemplateMiddle（複数置換の中間部）も空白化される', () => {
    const { structure } = sanitizeForChecks('const t = `a${x}Partial<User>${y}b`')
    expect(structure).not.toMatch(PARTIAL_CHECK)
  })

  it('${} 内の式は実コードとして検査対象に残る', () => {
    const { structure } = sanitizeForChecks('const t = `value: ${count + 1}`')
    expect(structure).toContain('count + 1')
  })

  it('${} 内の文字列リテラルは文字列として空白化される', () => {
    const { structure } = sanitizeForChecks('const t = `${"Partial<User>"}`')
    expect(structure).not.toMatch(PARTIAL_CHECK)
  })

  it('${} 内にオブジェクトリテラル（{ } ネスト）があっても文脈を見失わない', () => {
    const { structure } = sanitizeForChecks('const t = `${{ a: 1 }.a}Partial<User>${0}`')
    expect(structure).not.toMatch(PARTIAL_CHECK)
  })

  it('ネストしたテンプレートでも文脈を見失わない', () => {
    const { structure } = sanitizeForChecks('const t = `${`inner${0}`}Partial<User>${0}`')
    expect(structure).not.toMatch(PARTIAL_CHECK)
  })

  it('テンプレート終了後の通常コードは保持される', () => {
    const { structure } = sanitizeForChecks('const t = `x${0}y`\nconst keep: Partial<User> = {}')
    expect(structure).toMatch(PARTIAL_CHECK)
  })
})

describe('sanitizeForChecks: 正規表現リテラルバイパス（2026-06-11 封鎖）', () => {
  it('= の後の正規表現は中身が空白化される', () => {
    const { structure, noComments } = sanitizeForChecks('const r = /Partial<User/g')
    expect(structure).not.toMatch(PARTIAL_CHECK)
    expect(noComments).toContain('Partial<User')
  })

  it('行頭（文頭）の正規表現も空白化される', () => {
    const { structure } = sanitizeForChecks('/Partial<User/g.test("x")')
    expect(structure).not.toMatch(PARTIAL_CHECK)
  })

  it('! の後の正規表現（!/re/.test() 形）も空白化される', () => {
    const { structure } = sanitizeForChecks('const ok = !/Partial<User/g.test("x")')
    expect(structure).not.toMatch(PARTIAL_CHECK)
  })

  it('正規表現の後に続く通常コードは保持される', () => {
    const { structure } = sanitizeForChecks('const r = /abc/g\nconst keep: Partial<User> = {}')
    expect(structure).toMatch(PARTIAL_CHECK)
  })
})

describe('sanitizeForChecks: 異常系', () => {
  it('未終端文字列でも throw しない', () => {
    expect(() => sanitizeForChecks('const s = "abc')).not.toThrow()
  })

  it('未終端テンプレートでも throw しない', () => {
    expect(() => sanitizeForChecks('const t = `abc${1}')).not.toThrow()
  })

  it('空文字列を処理できる', () => {
    expect(sanitizeForChecks('')).toEqual({ structure: '', noComments: '' })
  })
})
