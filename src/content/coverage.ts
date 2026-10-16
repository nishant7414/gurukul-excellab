import { CONCEPTS, type SourceConcept } from "../data/audit";
import type { Exercise, Lesson } from "../learning/types";
import { ALL_LESSONS } from "./lessons";
import { ALL_EXERCISES } from "./registry";

export interface ConceptCoverage {
  concept: SourceConcept;
  lesson?: Lesson;
  /** exercises (anywhere in the app) that list this concept id */
  exercises: Exercise[];
  /** a lesson exists AND at least one exercise practises the concept */
  covered: boolean;
}

export function conceptCoverage(): ConceptCoverage[] {
  return CONCEPTS.map((concept) => {
    const lesson = ALL_LESSONS.find((l) => l.id === concept.lessonId);
    const exercises = ALL_EXERCISES.filter((e) => e.conceptIds.includes(concept.id));
    return { concept, lesson, exercises, covered: !!lesson && exercises.length > 0 };
  });
}
