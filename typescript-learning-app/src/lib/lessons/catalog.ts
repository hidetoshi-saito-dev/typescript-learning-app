import type { Lesson } from '@/types'
import { lesson as lesson001 } from './data/001-type-annotation'
import { lesson as lesson002 } from './data/002-number-boolean'
import { lesson as lesson003 } from './data/003-return-type'
import { lesson as lesson004 } from './data/004-array-type'
import { lesson as lesson005 } from './data/005-object-type'
import { lesson as lesson006 } from './data/006-union-type'
import { lesson as lesson007 } from './data/007-optional-property'
import { lesson as lesson008 } from './data/008-type-alias'
import { lesson as lesson009 } from './data/009-literal-type'
import { lesson as lesson010 } from './data/010-intersection-type'
import { lesson as lesson011 } from './data/011-interface'
import { lesson as lesson012 } from './data/012-typeof-guard'
import { lesson as lesson013 } from './data/013-in-guard'
import { lesson as lesson014 } from './data/014-generics-basic'
import { lesson as lesson015 } from './data/015-generics-constraint'

const LESSONS: Lesson[] = [
  lesson001,
  lesson002,
  lesson003,
  lesson004,
  lesson005,
  lesson006,
  lesson007,
  lesson008,
  lesson009,
  lesson010,
  lesson011,
  lesson012,
  lesson013,
  lesson014,
  lesson015,
]

const catalog = new Map(LESSONS.map((l) => [l.id, l]))

export function getCatalog(): Map<string, Lesson> {
  return catalog
}

export function getCatalogList(): Lesson[] {
  return [...catalog.values()]
}

export function getLesson(id: string): Lesson | undefined {
  return catalog.get(id)
}
