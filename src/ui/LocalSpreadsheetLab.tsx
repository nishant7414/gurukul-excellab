import { Component, type ErrorInfo, type ReactNode } from "react";
import { Download } from "lucide-react";
import { downloadWorkbook, type ExportOptions } from "../engine/export";
import type { WorkbookData } from "../engine/types";
import type { CellFeedback, ToolId } from "../learning/types";
import { GOOGLE_SHEETS_HOME } from "../sheets/messages";
import { usePersistStatus } from "../state/store";
import { Spreadsheet } from "./Spreadsheet";

export interface LocalSpreadsheetLabProps {
  workbook: WorkbookData;
  onChange: (wb: WorkbookData) => void;
  activeSheet: string;
  onActiveSheet: (name: string) => void;
  editable?: string[];
  editableSheet?: string;
  feedback?: CellFeedback[];
  emphasise?: ToolId[];
  height?: number;
  googleOpenUrl?: string | null;
  allowSheetOps?: boolean;
  exportOptions?: ExportOptions;
}

/** Simple green grid mark. Not Google's official logo asset. */
export function GoogleSheetsMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="gs-mark">
      <rect width="16" height="16" rx="2.2" fill="#188038" />
      <rect x="3" y="3" width="10" height="10" rx="0.6" fill="#fff" />
      <path d="M3 6.3h10M3 9.7h10M6.3 3v10M9.7 3v10" stroke="#188038" strokeWidth="1" />
    </svg>
  );
}

class SpreadsheetErrorBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : "The spreadsheet could not start." };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LocalSpreadsheetLab failed", error, info.componentStack);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="callout warn" role="alert">
          The practice workbook could not load. Refresh the page or use Download for Excel. ({this.state.err})
        </div>
      );
    }
    return this.props.children;
  }
}

function persistHint(status: string, message?: string) {
  if (status === "saving") return "Saving…";
  if (status === "error") return message ?? "Save failed";
  return "";
}

export function LocalSpreadsheetLab({
  workbook,
  onChange,
  activeSheet,
  onActiveSheet,
  editable,
  editableSheet,
  feedback,
  emphasise,
  height = 640,
  googleOpenUrl,
  allowSheetOps = true,
  exportOptions,
}: LocalSpreadsheetLabProps) {
  const persist = usePersistStatus();
  const saveNote = persistHint(persist.status, persist.message);

  const downloadExcel = () => {
    downloadWorkbook(workbook, {
      ...exportOptions,
      kind: "xlsx",
      includeInstructionsSheet: exportOptions?.includeInstructionsSheet ?? true,
    });
  };

  const openGoogle = () => {
    const dest = googleOpenUrl ?? GOOGLE_SHEETS_HOME;
    window.open(dest, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="local-lab local-lab-compact glass card" aria-label="Practice workbook">
      <div className="local-lab-toolbar row between">
        <span className="small faint" role="status" aria-live="polite">{saveNote}</span>
        <div className="local-lab-export-toolbar" role="toolbar" aria-label="Export and external spreadsheet">
          <button type="button" className="btn btn-lab-google btn-sm" aria-label="Open in Google Sheets" onClick={openGoogle}>
            <GoogleSheetsMark /> Open in Google Sheets
          </button>
          <button type="button" className="btn btn-sm" aria-label="Download for Excel" onClick={downloadExcel}>
            <Download size={15} aria-hidden="true" /> Download for Excel
          </button>
        </div>
      </div>

      <SpreadsheetErrorBoundary>
        <div className="local-lab-sheet">
          <Spreadsheet
            workbook={workbook}
            onChange={onChange}
            activeSheet={activeSheet}
            onActiveSheet={onActiveSheet}
            editable={editable}
            editableSheet={editableSheet}
            feedback={feedback}
            emphasise={emphasise}
            allowSheetOps={allowSheetOps}
            height={height}
          />
        </div>
      </SpreadsheetErrorBoundary>
    </section>
  );
}
