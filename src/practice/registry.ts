import type { Exercise } from "../learning/types";
import type { PracticeChallenge } from "./types";
import { LK } from "./ch-lk";
import { CA } from "./ch-ca";
import { DC } from "./ch-dc";
import { DA } from "./ch-da";
import { LG } from "./ch-lg";
import { DT } from "./ch-dt";
import { TX } from "./ch-tx";
import { SM } from "./ch-sm";
import { RF } from "./ch-rf";
import { SF } from "./ch-sf";
import { FIN } from "./ch-fin";
import { CS } from "./ch-cs";

const ALL = [...LK, ...CA, ...DC, ...DA, ...LG, ...DT, ...TX, ...SM, ...RF, ...SF, ...FIN, ...CS];
/** every dataset-driven practice challenge (the six original challenges CH-1..CH-6 live in content/ex-challenges.ts and are listed separately) */
export const PRACTICE: PracticeChallenge[] = ALL.map((a) => a.challenge);
export const PRACTICE_EXERCISES: Exercise[] = ALL.map((a) => a.exercise);
export const PRACTICE_BY_ID = new Map(PRACTICE.map((c) => [c.id, c]));
