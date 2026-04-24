import { describe, expect, it } from "vitest";
import {
  buildBundleJson,
  buildIssueUrl,
  validateBundleForm,
} from "../lib/bundle-export.js";

const NOW = new Date("2026-04-24T12:00:00.000Z");

const SKILLS = [
  {
    id: "owner/repo::a::hello-world",
    name: "hello-world",
    installUrl: "github:owner/repo:skills/hello-world",
    description: "A friendly greeting skill.",
    version: "1.0.0",
  },
  {
    id: "owner/repo::b::readme-gen",
    name: "readme-generator",
    installUrl: "github:owner/repo:skills/readme-gen",
    description: "Generates great READMEs.",
    version: "0.0.0",
  },
];

describe("buildBundleJson", () => {
  it("produces a BundleManifest with the required fields", () => {
    const meta = {
      name: "my-pack",
      description: "A test pack.",
      author: "alice",
      tags: "demo, docs",
    };
    const bundle = buildBundleJson(SKILLS, meta, NOW);
    expect(bundle).toMatchObject({
      version: 1,
      name: "my-pack",
      description: "A test pack.",
      author: "alice",
      createdAt: NOW.toISOString(),
      tags: ["demo", "docs"],
    });
    expect(bundle.skills).toHaveLength(2);
    expect(bundle.skills[0]).toEqual({
      name: "hello-world",
      installUrl: "github:owner/repo:skills/hello-world",
      description: "A friendly greeting skill.",
      version: "1.0.0",
    });
    // version "0.0.0" is the default sentinel and should be omitted
    expect(bundle.skills[1].version).toBeUndefined();
  });

  it("omits tags when empty and trims metadata", () => {
    const bundle = buildBundleJson(
      [SKILLS[0]],
      {
        name: "  trimmed  ",
        description: " with space ",
        author: "  bob ",
        tags: "  ",
      },
      NOW,
    );
    expect(bundle.name).toBe("trimmed");
    expect(bundle.description).toBe("with space");
    expect(bundle.author).toBe("bob");
    expect(bundle.tags).toBeUndefined();
  });
});

describe("validateBundleForm", () => {
  it("requires a name and ≥1 skill", () => {
    const errors = validateBundleForm({ name: "" }, []);
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("name");
    expect(fields).toContain("skills");
  });

  it("rejects invalid name characters", () => {
    const errors = validateBundleForm({ name: "bad name!" }, SKILLS);
    expect(errors.some((e) => e.field === "name")).toBe(true);
  });

  it("accepts a sensible valid form", () => {
    const errors = validateBundleForm(
      { name: "content.pack_v2-alpha" },
      SKILLS,
    );
    expect(errors).toEqual([]);
  });
});

describe("buildIssueUrl", () => {
  it("produces a github issues URL with title/body/labels", () => {
    const url = buildIssueUrl(SKILLS, {
      name: "my-pack",
      description: "Short desc",
      author: "alice",
      tags: "docs",
    });
    expect(url).toMatch(
      /^https:\/\/github\.com\/luongnv89\/asm\/issues\/new\?/,
    );
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.get("title")).toBe("[FEATURE] Bundle: my-pack");
    expect(qs.get("labels")).toBe("enhancement,feature");
    const body = qs.get("body");
    expect(body).toContain("my-pack");
    expect(body).toContain("alice");
    expect(body).toContain("hello-world");
    expect(body).toContain("readme-generator");
  });

  it("uses each skill's id (not installUrl) for the catalog deep link", () => {
    // The router's `useParams` decodes via `decodeSkillId(encodedId)`,
    // so the link target must be the skill `id`. Passing installUrl
    // here would 404 every link in the published issue.
    const url = buildIssueUrl(
      [SKILLS[0]],
      { name: "one" },
      { catalogBaseUrl: "https://example.test/asm/" },
    );
    const body = new URLSearchParams(url.split("?")[1]).get("body");
    const expectedLink = `https://example.test/asm/#/skills/${encodeURIComponent(
      SKILLS[0].id,
    )}`;
    expect(body).toContain(expectedLink);
    // And must NOT fall back to the installUrl
    expect(body).not.toContain(
      `#/skills/${encodeURIComponent(SKILLS[0].installUrl)}`,
    );
  });

  it("keeps the whole URL within the encoded byte limit under large bundles", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      id: `o/r::x::sk-${i}`,
      name: `skill-${i}-name-that-is-somewhat-long-to-consume-bytes`,
      installUrl: `github:o/r:skills/skill-${i}-name-that-is-somewhat-long-to-consume-bytes`,
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    }));
    const maxBodyBytes = 3000;
    const url = buildIssueUrl(many, { name: "big" }, { maxBodyBytes });
    const body = new URLSearchParams(url.split("?")[1]).get("body");
    expect(body).toMatch(/more\*\* skill/);
    // Encoded body (what actually goes into the URL) stays within cap +
    // a small overhead for header/footer + truncation note.
    expect(encodeURIComponent(body).length).toBeLessThan(maxBodyBytes + 1500);
  });
});
