import { EDU_DATASETS } from "./lib-edu";
import { SALES_DATASETS } from "./lib-sales";
import { HR_DATASETS } from "./lib-hr";
import { FIN_DATASETS } from "./lib-fin";
import { SUPPLY_DATASETS } from "./lib-supply";
import { SERVICE_DATASETS } from "./lib-service";
import { OPS_DATASETS } from "./lib-ops";
import { MESSY_DATASETS } from "./lib-messy";
import { sourceDatasets } from "./source-datasets";
import { legacyDatasets } from "../practice/legacy";
import type { Dataset } from "./types";

/** The reusable dataset library. Only metadata is held here; rows are generated the first time a dataset is opened. */
export const NEW_DATASETS: Dataset[] = [...EDU_DATASETS, ...SALES_DATASETS, ...HR_DATASETS, ...FIN_DATASETS, ...SUPPLY_DATASETS, ...SERVICE_DATASETS, ...OPS_DATASETS, ...MESSY_DATASETS];
export const SOURCE_DATASETS: Dataset[] = sourceDatasets();
export const LEGACY_DATASETS: Dataset[] = legacyDatasets();
export const DATASETS: Dataset[] = [...SOURCE_DATASETS, ...LEGACY_DATASETS, ...NEW_DATASETS];
export const DATASET_BY_ID = new Map(DATASETS.map((d) => [d.id, d]));
export const dataset = (id: string): Dataset => {
  const d = DATASET_BY_ID.get(id);
  if (!d) throw new Error(`Unknown dataset "${id}"`);
  return d;
};
