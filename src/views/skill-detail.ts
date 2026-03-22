import { BoxRenderable, TextRenderable } from "@opentui/core";
import type { RenderContext } from "@opentui/core";
import { theme } from "../utils/colors";
import type { SkillInfo } from "../utils/types";
import { countFiles } from "../scanner";
import { wordWrap } from "../formatter";

const EFFORT_COLORS: Record<string, string> = {
  low: theme.green,
  medium: theme.yellow,
  high: theme.red,
  max: theme.accentAlt, // magenta
};

function detailRow(
  ctx: RenderContext,
  id: string,
  label: string,
  value: string,
  valueColor: string = theme.fg,
): BoxRenderable {
  const row = new BoxRenderable(ctx, {
    id: `detail-row-${id}`,
    flexDirection: "row",
    width: "100%",
    height: 1,
  });

  const labelText = new TextRenderable(ctx, {
    content: `${label}:`.padEnd(15),
    fg: theme.fgDim,
    width: 16,
  });

  const valueText = new TextRenderable(ctx, {
    content: value,
    fg: valueColor,
  });

  row.add(labelText);
  row.add(valueText);
  return row;
}

export function createDetailView(
  ctx: RenderContext,
  skill: SkillInfo,
): BoxRenderable {
  const boxWidth = 64;
  const descMaxWidth = 56;
  const desc = skill.description || "(no description)";
  const wrappedDescLines = wordWrap(desc, descMaxWidth);
  // base detail rows (name, version, creator, license, tool, location, path, symlink, files, scope) = 10
  // + optional rows: effort, compatibility, allowed-tools (label + tools + optional warning)
  const effortRows = skill.effort ? 1 : 0;
  const compatRows = skill.compatibility ? 1 : 0;
  const toolsRows = skill.allowedTools && skill.allowedTools.length > 0 ? 2 : 0;
  const boxHeight = Math.min(
    ctx.height - 2,
    10 +
      effortRows +
      compatRows +
      toolsRows +
      2 +
      wrappedDescLines.length +
      2 +
      2 +
      2,
  );
  const top = Math.max(0, Math.floor((ctx.height - boxHeight) / 2));
  const left = Math.max(0, Math.floor((ctx.width - boxWidth) / 2));

  const container = new BoxRenderable(ctx, {
    id: "detail-overlay",
    border: true,
    borderStyle: "rounded",
    borderColor: theme.accent,
    backgroundColor: theme.bgAlt,
    title: ` ${skill.name} `,
    titleAlignment: "center",
    padding: 1,
    flexDirection: "column",
    gap: 0,
    width: boxWidth,
    height: boxHeight,
    position: "absolute",
    top,
    left,
    zIndex: 100,
  });

  container.add(detailRow(ctx, "name", "Name", skill.name, theme.accent));
  container.add(
    detailRow(ctx, "version", "Version", skill.version, theme.green),
  );
  container.add(
    detailRow(
      ctx,
      "creator",
      "Creator",
      skill.creator || "\u2014",
      skill.creator ? theme.fg : theme.fgDim,
    ),
  );
  container.add(
    detailRow(
      ctx,
      "license",
      "License",
      skill.license || "\u2014",
      skill.license ? theme.fg : theme.fgDim,
    ),
  );
  if (skill.compatibility) {
    container.add(
      detailRow(
        ctx,
        "compat",
        "Compatibility",
        skill.compatibility,
        theme.cyan,
      ),
    );
  }
  if (skill.effort) {
    container.add(
      detailRow(
        ctx,
        "effort",
        "Effort",
        skill.effort,
        EFFORT_COLORS[skill.effort.toLowerCase()] || theme.fg,
      ),
    );
  }
  container.add(
    detailRow(ctx, "provider", "Tool", skill.providerLabel, theme.accentAlt),
  );
  container.add(
    detailRow(ctx, "location", "Location", skill.location, theme.cyan),
  );
  container.add(detailRow(ctx, "path", "Path", skill.path));
  container.add(
    detailRow(
      ctx,
      "symlink",
      "Symlink",
      skill.isSymlink ? `yes \u2192 ${skill.symlinkTarget}` : "no",
      skill.isSymlink ? theme.yellow : theme.fgDim,
    ),
  );
  const fileCountDisplay =
    skill.fileCount !== undefined ? String(skill.fileCount) : "...";
  const filesValueText = new TextRenderable(ctx, {
    content: fileCountDisplay,
    fg: theme.fg,
  });
  const filesRow = new BoxRenderable(ctx, {
    id: "detail-row-files",
    flexDirection: "row",
    width: "100%",
    height: 1,
  });
  filesRow.add(
    new TextRenderable(ctx, {
      content: "Files:".padEnd(15),
      fg: theme.fgDim,
      width: 16,
    }),
  );
  filesRow.add(filesValueText);
  container.add(filesRow);

  if (skill.fileCount === undefined) {
    countFiles(skill.path)
      .then((count) => {
        filesValueText.content = String(count);
      })
      .catch(() => {});
  }
  container.add(detailRow(ctx, "scope", "Scope", skill.scope, theme.accentAlt));

  const descLabel = new TextRenderable(ctx, {
    content: "\nDescription:",
    fg: theme.fgDim,
    height: 2,
  });
  container.add(descLabel);

  // Show as many description lines as fit; truncate only if terminal is too small
  const maxDescLines = Math.max(1, boxHeight - 9 - 2 - 2 - 2 - 2);
  const visibleLines = wrappedDescLines.slice(0, maxDescLines);
  if (visibleLines.length < wrappedDescLines.length) {
    const lastLine = visibleLines[visibleLines.length - 1];
    visibleLines[visibleLines.length - 1] =
      lastLine.length > descMaxWidth - 3
        ? lastLine.slice(0, descMaxWidth - 3) + "..."
        : lastLine + "...";
  }
  const descText = new TextRenderable(ctx, {
    content: visibleLines.map((l) => `  ${l}`).join("\n"),
    fg: theme.fg,
    width: 58,
    height: visibleLines.length,
  });
  container.add(descText);

  if (skill.allowedTools && skill.allowedTools.length > 0) {
    const HIGH_RISK = new Set(["Bash", "Write", "Edit", "NotebookEdit"]);
    const MEDIUM_RISK = new Set(["WebFetch", "WebSearch"]);
    const toolsLabel = new TextRenderable(ctx, {
      content: "\nAllowed Tools:",
      fg: theme.fgDim,
      height: 2,
    });
    container.add(toolsLabel);
    const toolsText = new TextRenderable(ctx, {
      content:
        "  " +
        skill.allowedTools
          .map((t) => {
            if (HIGH_RISK.has(t)) return `[${t}]`;
            if (MEDIUM_RISK.has(t)) return `[${t}]`;
            return `[${t}]`;
          })
          .join(" "),
      fg: skill.allowedTools.some((t) => HIGH_RISK.has(t))
        ? theme.red
        : theme.green,
    });
    container.add(toolsText);
  }

  const footer = new TextRenderable(ctx, {
    content: "\n  Esc Back    d Uninstall",
    fg: theme.fgDim,
  });
  container.add(footer);

  return container;
}
