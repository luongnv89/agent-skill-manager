import { ansi } from "../formatter";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CheckboxItem {
  label: string;
  hint?: string;
  checked: boolean;
}

export interface CheckboxPickerOptions {
  items: CheckboxItem[];
  pageSize?: number;
}

// ─── Pure State Machine ──────────────────────────────────────────────────────

export class CheckboxState {
  selected: boolean[];
  cursor: number; // 0 = "Select All" virtual row, 1..N = items
  scrollOffset: number;
  readonly pageSize: number;
  readonly totalRows: number; // items.length + 1 (for "Select All")

  constructor(items: CheckboxItem[], pageSize: number) {
    this.selected = items.map((i) => i.checked);
    this.cursor = 1; // start on first real item, not "Select All"
    this.scrollOffset = 0;
    this.pageSize = pageSize;
    this.totalRows = items.length + 1;
  }

  toggleCurrent(): void {
    if (this.cursor === 0) {
      this.toggleAll();
    } else {
      const idx = this.cursor - 1;
      this.selected[idx] = !this.selected[idx];
    }
  }

  toggleAll(): void {
    const allChecked = this.selected.every(Boolean);
    const newValue = !allChecked;
    for (let i = 0; i < this.selected.length; i++) {
      this.selected[i] = newValue;
    }
  }

  moveUp(): void {
    if (this.cursor > 0) {
      this.cursor--;
    } else {
      this.cursor = this.totalRows - 1;
    }
    this.adjustScroll();
  }

  moveDown(): void {
    if (this.cursor < this.totalRows - 1) {
      this.cursor++;
    } else {
      this.cursor = 0;
    }
    this.adjustScroll();
  }

  getSelectedIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.selected.length; i++) {
      if (this.selected[i]) indices.push(i);
    }
    return indices;
  }

  getVisibleRange(): { start: number; end: number } {
    const start = this.scrollOffset;
    const end = Math.min(this.scrollOffset + this.pageSize, this.totalRows);
    return { start, end };
  }

  private adjustScroll(): void {
    if (this.cursor < this.scrollOffset) {
      this.scrollOffset = this.cursor;
    } else if (this.cursor >= this.scrollOffset + this.pageSize) {
      this.scrollOffset = this.cursor - this.pageSize + 1;
    }
  }
}

// ─── Pure Renderer ───────────────────────────────────────────────────────────

export function renderCheckboxLines(
  state: CheckboxState,
  items: CheckboxItem[],
  width: number,
): string[] {
  const lines: string[] = [];
  const { start, end } = state.getVisibleRange();

  // Scroll indicator: above
  if (start > 0) {
    lines.push(ansi.dim(`  ... ${start} more above`));
  }

  for (let row = start; row < end; row++) {
    const isCursor = row === state.cursor;
    const pointer = isCursor ? ansi.cyan(">") : " ";

    if (row === 0) {
      // "Select All" virtual row
      const allChecked = state.selected.every(Boolean);
      const marker = allChecked ? ansi.green("[*]") : "[ ]";
      const label = "Select All / Deselect All";
      lines.push(`${pointer} ${marker} ${ansi.bold(label)}`);
    } else {
      const idx = row - 1;
      const item = items[idx];
      const checked = state.selected[idx];
      const marker = checked ? ansi.green("[*]") : "[ ]";

      // Build the line: "> [*] label  hint"
      // Prefix: "> [*] " = 7 chars visible
      const prefix = `${pointer} ${marker} `;
      const prefixLen = 7; // "> [*] " or "  [*] "
      const labelStr = ansi.bold(item.label);
      const labelLen = item.label.length;

      if (item.hint) {
        const availableForHint = width - prefixLen - labelLen - 2; // 2 for "  " separator
        if (availableForHint > 10) {
          const truncatedHint = truncateText(item.hint, availableForHint);
          lines.push(`${prefix}${labelStr}  ${ansi.dim(truncatedHint)}`);
        } else {
          // No room for hint
          const truncatedLabel = truncateText(item.label, width - prefixLen);
          lines.push(`${prefix}${ansi.bold(truncatedLabel)}`);
        }
      } else {
        const truncatedLabel = truncateText(item.label, width - prefixLen);
        lines.push(`${prefix}${ansi.bold(truncatedLabel)}`);
      }
    }
  }

  // Scroll indicator: below
  const remainingBelow = state.totalRows - end;
  if (remainingBelow > 0) {
    lines.push(ansi.dim(`  ... ${remainingBelow} more below`));
  }

  // Selection count
  const selectedCount = state.getSelectedIndices().length;
  lines.push("");
  lines.push(
    ansi.dim(
      `  ${selectedCount} of ${items.length} selected  |  ` +
        `↑/↓ Navigate  Space Toggle  a All  Enter Confirm  Esc Cancel`,
    ),
  );

  return lines;
}

function truncateText(text: string, maxLen: number): string {
  if (maxLen <= 0) return "";
  if (text.length <= maxLen) return text;
  if (maxLen <= 3) return text.slice(0, maxLen);
  return text.slice(0, maxLen - 3) + "...";
}

// ─── I/O Orchestrator ────────────────────────────────────────────────────────

export async function checkboxPicker(
  options: CheckboxPickerOptions,
): Promise<number[]> {
  const { items } = options;
  const pageSize = options.pageSize ?? Math.min(items.length + 1, 15);
  const state = new CheckboxState(items, pageSize);

  const output = process.stderr;
  const input = process.stdin;
  const width = (output as any).columns || 80;

  // Enable raw mode
  if (typeof input.setRawMode === "function") {
    input.setRawMode(true);
  }
  input.resume();
  input.setEncoding("utf-8");

  // Hide cursor
  output.write("\x1b[?25l");

  let lastLineCount = 0;

  function render() {
    // Move cursor up to overwrite previous render
    if (lastLineCount > 0) {
      output.write(`\x1b[${lastLineCount}A`);
    }

    const lines = renderCheckboxLines(state, items, width);

    for (const line of lines) {
      output.write(`\x1b[2K${line}\n`);
    }

    // Clear any leftover lines from previous render
    if (lines.length < lastLineCount) {
      for (let i = 0; i < lastLineCount - lines.length; i++) {
        output.write("\x1b[2K\n");
      }
      // Move back up for the extra cleared lines
      output.write(`\x1b[${lastLineCount - lines.length}A`);
    }

    lastLineCount = lines.length;
  }

  // Initial render
  render();

  return new Promise<number[]>((resolve) => {
    let escBuf = "";
    let escTimer: ReturnType<typeof setTimeout> | null = null;

    function cleanup() {
      input.removeListener("data", onData);
      if (typeof input.setRawMode === "function") {
        input.setRawMode(false);
      }
      input.pause();
      // Show cursor
      output.write("\x1b[?25h");
      if (escTimer) clearTimeout(escTimer);
    }

    function finish(result: number[]) {
      cleanup();
      resolve(result);
    }

    function handleKey(key: string) {
      switch (key) {
        case "\x1b[A": // Up arrow
        case "k":
          state.moveUp();
          render();
          break;
        case "\x1b[B": // Down arrow
        case "j":
          state.moveDown();
          render();
          break;
        case " ": // Space — toggle
          state.toggleCurrent();
          render();
          break;
        case "a": // Toggle all
          state.toggleAll();
          render();
          break;
        case "\r": // Enter — confirm
        case "\n":
          finish(state.getSelectedIndices());
          break;
        case "\x1b": // Escape (standalone)
          finish([]);
          break;
        case "\x03": // Ctrl-C
          cleanup();
          process.kill(process.pid, "SIGINT");
          break;
      }
    }

    function onData(data: string) {
      // Handle escape sequences
      if (escBuf.length > 0) {
        escBuf += data;
        if (escTimer) clearTimeout(escTimer);

        // Check if we have a complete escape sequence
        if (escBuf.length >= 3 && escBuf[1] === "[") {
          const seq = escBuf.slice(0, 3);
          const remainder = escBuf.slice(3);
          escBuf = "";
          handleKey(seq);
          // Process any remaining data
          if (remainder) onData(remainder);
          return;
        }

        // If we got data that doesn't form a known sequence, treat as standalone escape
        const buf = escBuf;
        escBuf = "";
        handleKey("\x1b");
        // Process remaining chars after the escape
        for (let i = 1; i < buf.length; i++) {
          handleKey(buf[i]);
        }
        return;
      }

      // Process each character/sequence
      for (let i = 0; i < data.length; i++) {
        const ch = data[i];

        if (ch === "\x1b") {
          // Start of potential escape sequence
          const remaining = data.slice(i);
          if (remaining.length >= 3 && remaining[1] === "[") {
            handleKey(remaining.slice(0, 3));
            i += 2; // skip the next 2 chars
          } else if (remaining.length >= 2) {
            // Partial sequence in this chunk — buffer it
            escBuf = remaining;
            escTimer = setTimeout(() => {
              const buf = escBuf;
              escBuf = "";
              handleKey("\x1b");
              for (let j = 1; j < buf.length; j++) {
                handleKey(buf[j]);
              }
            }, 50);
            return; // stop processing this data chunk
          } else {
            // Single escape byte — buffer with timeout
            escBuf = "\x1b";
            escTimer = setTimeout(() => {
              escBuf = "";
              handleKey("\x1b");
            }, 50);
            return;
          }
        } else {
          handleKey(ch);
        }
      }
    }

    input.on("data", onData);
  });
}
