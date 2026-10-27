import { acetyleneLesson } from './acetylene'
import { cellLesson } from './cell'
import { chlorineLesson } from './chlorine'
import { electrolysisLesson } from './electrolysis'
import { fountainLesson } from './fountain'
import { ironLesson } from './iron'
import { rateLesson } from './rate'
import { saltLesson } from './salt'
import { sodiumLesson } from './sodium'
import { solutionLesson } from './solution'
import { thermiteLesson } from './thermite'
import { titrationLesson } from './titration'
import type { Lesson } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LESSONS: Lesson<any>[] = [solutionLesson, ironLesson, saltLesson, cellLesson, rateLesson, titrationLesson, chlorineLesson, sodiumLesson, thermiteLesson, fountainLesson, acetyleneLesson, electrolysisLesson]
