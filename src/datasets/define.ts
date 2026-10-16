import type { Scalar } from "../engine/types";
import { makeRng } from "./rng";
import type { Dataset, DatasetInput } from "./types";

/** Build a dataset whose rows are generated on first use (deterministically, from the dataset id) and then memoised. */
export function defineDataset(d: DatasetInput): Dataset {
  let cache: { rows: Scalar[][]; clean?: Scalar[][] } | null = null;
  const load = () => {
    if (cache) return cache;
    const rng = makeRng(d.id);
    if (d.pair) { const p = d.pair(rng); cache = { rows: p.messy, clean: p.clean }; }
    else cache = { rows: d.gen!(rng) };
    return cache;
  };
  const { gen: _g, pair: _p, ...meta } = d;
  return { related: [], concepts: [], issues: [], ...meta, origin: "generated", rows: () => load().rows, clean: d.pair ? () => load().clean! : undefined };
}
