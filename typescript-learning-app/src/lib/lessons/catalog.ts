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
import { lesson as lesson016 } from './data/016-keyof'
import { lesson as lesson017 } from './data/017-indexed-access'
import { lesson as lesson018 } from './data/018-typeof-type'
import { lesson as lesson019 } from './data/019-as-const'
import { lesson as lesson020 } from './data/020-readonly'
import { lesson as lesson021 } from './data/021-partial-required'
import { lesson as lesson022 } from './data/022-pick'
import { lesson as lesson023 } from './data/023-omit'
import { lesson as lesson024 } from './data/024-record'
import { lesson as lesson025 } from './data/025-unknown'
import { lesson as lesson026 } from './data/026-discriminated-union'
import { lesson as lesson027 } from './data/027-never-exhaustiveness'
import { lesson as lesson028 } from './data/028-type-predicate'
import { lesson as lesson029 } from './data/029-function-type'
import { lesson as lesson030 } from './data/030-promise'
import { lesson as lesson031 } from './data/031-awaited-async'
import { lesson as lesson032 } from './data/032-conditional-type'
import { lesson as lesson033 } from './data/033-distributive-conditional'
import { lesson as lesson034 } from './data/034-infer-return'
import { lesson as lesson035 } from './data/035-infer-element'
import { lesson as lesson036 } from './data/036-template-literal-type'
import { lesson as lesson037 } from './data/037-template-literal-union'
import { lesson as lesson038 } from './data/038-satisfies'
import { lesson as lesson039 } from './data/039-event-name'
import { lesson as lesson040 } from './data/040-order-status-model'
import { lesson as lesson041 } from './data/041-menu-master-satisfies'
import { lesson as lesson042 } from './data/042-order-input-guard'

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
  lesson016,
  lesson017,
  lesson018,
  lesson019,
  lesson020,
  lesson021,
  lesson022,
  lesson023,
  lesson024,
  lesson025,
  lesson026,
  lesson027,
  lesson028,
  lesson029,
  lesson030,
  lesson031,
  lesson032,
  lesson033,
  lesson034,
  lesson035,
  lesson036,
  lesson037,
  lesson038,
  lesson039,
  lesson040,
  lesson041,
  lesson042,
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
