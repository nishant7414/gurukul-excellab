import { writeFileSync } from "node:fs";
import { buildCoverageReport, formatReport } from "../src/practice/coverage";

/** npx tsx scripts/coverage-report.ts [--quick]   writes COVERAGE_REPORT.txt from the real registries */
const quick = process.argv.includes("--quick");
const text = formatReport(buildCoverageReport({ deep: !quick }));
writeFileSync(new URL("../COVERAGE_REPORT.txt", import.meta.url), text + "\n", "utf8");
console.log(text);
