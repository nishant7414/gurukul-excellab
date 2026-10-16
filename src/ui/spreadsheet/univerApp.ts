import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import { defaultTheme } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { UniverSheetsFilterPreset } from "@univerjs/preset-sheets-filter";
import UniverPresetSheetsFilterEnUS from "@univerjs/preset-sheets-filter/locales/en-US";
import { UniverSheetsDataValidationPreset } from "@univerjs/preset-sheets-data-validation";
import UniverPresetSheetsDataValidationEnUS from "@univerjs/preset-sheets-data-validation/locales/en-US";
import { UniverSheetsFindReplacePreset } from "@univerjs/preset-sheets-find-replace";
import UniverPresetSheetsFindReplaceEnUS from "@univerjs/preset-sheets-find-replace/locales/en-US";
import { UniverSheetsHyperLinkPreset } from "@univerjs/preset-sheets-hyper-link";
import UniverPresetSheetsHyperLinkEnUS from "@univerjs/preset-sheets-hyper-link/locales/en-US";
import { UniverSheetsConditionalFormattingPreset } from "@univerjs/preset-sheets-conditional-formatting";
import UniverPresetSheetsConditionalFormattingEnUS from "@univerjs/preset-sheets-conditional-formatting/locales/en-US";
import { UniverSheetsNotePreset } from "@univerjs/preset-sheets-note";
import UniverPresetSheetsNoteEnUS from "@univerjs/preset-sheets-note/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import "@univerjs/preset-sheets-filter/lib/index.css";
import "@univerjs/preset-sheets-data-validation/lib/index.css";
import "@univerjs/preset-sheets-find-replace/lib/index.css";
import "@univerjs/preset-sheets-hyper-link/lib/index.css";
import "@univerjs/preset-sheets-conditional-formatting/lib/index.css";
import "@univerjs/preset-sheets-note/lib/index.css";

export function startUniverSheets(container: HTMLElement, opts: { allowSheetOps: boolean; dark: boolean }) {
  return createUniver({
    locale: LocaleType.EN_US,
    locales: {
      [LocaleType.EN_US]: mergeLocales(
        UniverPresetSheetsCoreEnUS,
        UniverPresetSheetsFilterEnUS,
        UniverPresetSheetsDataValidationEnUS,
        UniverPresetSheetsFindReplaceEnUS,
        UniverPresetSheetsHyperLinkEnUS,
        UniverPresetSheetsConditionalFormattingEnUS,
        UniverPresetSheetsNoteEnUS,
      ),
    },
    theme: defaultTheme,
    darkMode: opts.dark,
    presets: [
      UniverSheetsCorePreset({
        container,
        toolbar: true,
        ribbonType: "classic",
        formulaBar: true,
        contextMenu: true,
        footer: {
          sheetBar: true,
          statisticBar: true,
          menus: true,
          zoomSlider: true,
          addSheetButtonConfig: { show: opts.allowSheetOps },
        },
      }),
      UniverSheetsFilterPreset(),
      UniverSheetsDataValidationPreset(),
      UniverSheetsFindReplacePreset(),
      UniverSheetsHyperLinkPreset({
        urlHandler: { navigateToOtherWebsite: (url: string) => window.open(url, "_blank", "noopener,noreferrer") },
      }),
      UniverSheetsConditionalFormattingPreset(),
      UniverSheetsNotePreset(),
    ],
  });
}
