import type { Exercise } from "../learning/types";
import { VLOOKUP_EXERCISES } from "./ex-vlookup";
import { FORMS_EXERCISES, TRANSPOSE_EXERCISES } from "./ex-transpose";
import { AUTOFILL_EXERCISES, TEXT_TO_COLUMNS_EXERCISES } from "./ex-fill";
import { TEXT_EXERCISES } from "./ex-text";
import { EXTRA_EXERCISES } from "./ex-extra";
import { CHALLENGE_EXERCISES } from "./ex-challenges";
import { QUIZ_EXERCISES } from "./quizzes";
import { PRACTICE_EXERCISES } from "../practice/registry";

export const ALL_EXERCISES: Exercise[] = [...TRANSPOSE_EXERCISES, ...FORMS_EXERCISES, ...AUTOFILL_EXERCISES, ...TEXT_TO_COLUMNS_EXERCISES, ...TEXT_EXERCISES, ...VLOOKUP_EXERCISES, ...EXTRA_EXERCISES, ...CHALLENGE_EXERCISES, ...PRACTICE_EXERCISES, ...QUIZ_EXERCISES];
export const EXERCISE_BY_ID = new Map(ALL_EXERCISES.map((e) => [e.id, e]));
