import type { SkillInfo, ExportManifest, ExportedSkill } from "./utils/types";

export function buildManifest(skills: SkillInfo[]): ExportManifest {
  // Skills discovered via plugin-marketplace scanning live inside editor-managed
  // plugin directories and are not installable via `asm import` — their lifecycle
  // is owned by the host editor's plugin manager. Exclude them from the manifest.
  const exportedSkills: ExportedSkill[] = skills
    .filter((s) => s.provider !== "plugin")
    .map((s) => ({
      name: s.name,
      version: s.version,
      dirName: s.dirName,
      provider: s.provider,
      scope: s.scope,
      path: s.path,
      isSymlink: s.isSymlink,
      symlinkTarget: s.symlinkTarget,
      effort: s.effort,
    }));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    skills: exportedSkills,
  };
}
