// sanitize.ts — ②型構文チェック用のソースコードサニタイザ
//
// 【役割】レッスンの②型構文チェックは __originalCode__（ユーザーソース）への正規表現で
// 「型キーワードを実コードとして書いたか」を判定する。生ソースのままだと、型を書かずに
// コメント・文字列・テンプレート・正規表現リテラルへキーワードを置くだけで一致してしまう
// （偽陽性＝チート合格）。そこで「コードとしての構造」だけを検査対象に残すため、
// TypeScript の字句スキャナでトークン分割し、非コード部分の中身を空白化する。
//   - structure  : コメント除去＋文字列/テンプレート/正規表現の中身ブランク（②型キーワード検査向け）
//   - noComments : コメント除去のみ・リテラル中身は保持（リテラル値を検査するレッスン向け）
// どちらも改行は保持する（エラー行番号をなるべく保つため）。
//
// 【経緯】コメント/文字列バイパスの封鎖は 2026-06-09、置換付きテンプレート
// （TemplateHead/Middle/Tail）と正規表現リテラルのバイパス封鎖は 2026-06-11 追補。
// 正本: .company/engineering/docs/2026-06-09-judge-false-positive.md
// 検証: 本モジュールのユニットテスト（sanitize.test.ts）＋ scripts/verify-lessons.cjs（ミラー実装）。
// ミラーを変更する場合は両方を必ず同期させること。

import ts from 'typescript'

export type SanitizedCode = {
  /** コメント除去＋文字列/テンプレート/正規表現の中身を空白化（②型構文チェック向け） */
  structure: string
  /** コメント除去のみ（リテラル値を検査するレッスン向け） */
  noComments: string
}

// 直前の有意トークンがこれらの場合、後続の `/` は除算であり正規表現ではない。
// JS の字句解釈は文脈依存（`a / b` は除算・`= /re/` は正規表現）でスキャナ単体では決定不能のため、
// パーサが用いるのと同系の「直前トークン」ヒューリスティックで再スキャン要否を判定する。
// 集合を保守的（小さめ）に保つ＝迷ったら正規表現として空白化する方針。誤って除算を空白化しても
// 模範解答の回帰は verify-lessons.cjs（CI 常設）が検出する。
const DIVISION_PRECEDING_TOKENS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.RegularExpressionLiteral,
  ts.SyntaxKind.ThisKeyword,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.SuperKeyword,
  ts.SyntaxKind.CloseParenToken,
  ts.SyntaxKind.CloseBracketToken,
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken,
])

/** 改行以外を空白に置き換える（行番号を保つ） */
function blank(s: string): string {
  return s.replace(/[^\r\n]/g, ' ')
}

/** 先頭 startLen 文字と末尾 endLen 文字（デリミタ）だけ残し、中身を空白化する */
function blankInside(text: string, startLen: number, endLen: number): string {
  if (text.length < startLen + endLen) return text
  return (
    text.slice(0, startLen) +
    blank(text.slice(startLen, text.length - endLen)) +
    text.slice(text.length - endLen)
  )
}

/**
 * 構造チェック用にユーザーコードをサニタイズする。
 * @returns structure（非コード中身を空白化）と noComments（コメント除去のみ）
 */
export function sanitizeForChecks(source: string): SanitizedCode {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    /* skipTrivia */ false,
    ts.LanguageVariant.Standard,
    source,
  )
  let structure = ''
  let noComments = ''
  // 除算/正規表現の判別用。トリビア（空白・改行・コメント）以外の直近トークンを保持する
  let lastSignificant: ts.SyntaxKind = ts.SyntaxKind.Unknown
  // 置換付きテンプレートの文脈スタック。各要素は「現在の置換式内の { } ネスト深さ」。
  // 素の scan() では置換を閉じる `}` は CloseBraceToken のままで、TemplateMiddle/Tail は
  // 出現しない（パーサが reScanTemplateToken を呼んで初めて再解釈される）。これを怠ると
  // `` `${0}Partial<T>${0}` `` の中間チャンクがコードトークンとして structure に漏れる。
  const templateBraceDepth: number[] = []
  let token = scanner.scan()
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    // `/` `/=` は除算が成立し得ない位置でのみ正規表現リテラルとして再スキャンする
    if (
      (token === ts.SyntaxKind.SlashToken || token === ts.SyntaxKind.SlashEqualsToken) &&
      !DIVISION_PRECEDING_TOKENS.has(lastSignificant)
    ) {
      token = scanner.reScanSlashToken()
    }
    // テンプレート置換内の `}` の解釈: 式中の { } ネストが解消済みなら、
    // この `}` は置換の終端 → TemplateMiddle / TemplateTail として再スキャンする
    if (token === ts.SyntaxKind.CloseBraceToken && templateBraceDepth.length > 0) {
      const last = templateBraceDepth.length - 1
      if (templateBraceDepth[last] === 0) {
        token = scanner.reScanTemplateToken(/* isTaggedTemplate */ false)
        if (token === ts.SyntaxKind.TemplateTail) {
          templateBraceDepth.pop()
        }
      } else {
        templateBraceDepth[last]--
      }
    } else if (token === ts.SyntaxKind.OpenBraceToken && templateBraceDepth.length > 0) {
      templateBraceDepth[templateBraceDepth.length - 1]++
    } else if (token === ts.SyntaxKind.TemplateHead) {
      templateBraceDepth.push(0)
    }
    const text = scanner.getTokenText()
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      const blanked = blank(text)
      structure += blanked
      noComments += blanked
    } else if (
      token === ts.SyntaxKind.StringLiteral ||
      token === ts.SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      // 区切り記号（引用符/バッククォート）だけ残し、中身を空白化
      structure += blankInside(text, 1, 1)
      noComments += text // リテラル値を検査するレッスン用に中身を保持
    } else if (token === ts.SyntaxKind.RegularExpressionLiteral) {
      // /pattern/flags → 先頭・末尾の1文字だけ残し中身（パターンとフラグ）を空白化
      structure += blankInside(text, 1, 1)
      noComments += text
    } else if (
      token === ts.SyntaxKind.TemplateHead ||
      token === ts.SyntaxKind.TemplateMiddle ||
      token === ts.SyntaxKind.TemplateTail
    ) {
      // 置換付きテンプレートのテキスト部。デリミタ（` / }...${ / `）だけ残して空白化する。
      // ${} 内の式はトークンとして別途現れるので、実コードとして検査対象に残る。
      const endLen = token === ts.SyntaxKind.TemplateTail ? 1 : 2 // 末尾は「`」or「${」
      structure += blankInside(text, 1, endLen)
      noComments += text
    } else {
      structure += text
      noComments += text
    }
    if (
      token !== ts.SyntaxKind.WhitespaceTrivia &&
      token !== ts.SyntaxKind.NewLineTrivia &&
      token !== ts.SyntaxKind.SingleLineCommentTrivia &&
      token !== ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      lastSignificant = token
    }
    token = scanner.scan()
  }
  return { structure, noComments }
}
