# Contributing to asm-registry

The asm-registry is a curated, PR-based registry for publishing verified AI agent skills.
This document explains how to publish a skill, the review process, and policies.

## How to Publish a Skill

### Prerequisites

- A public GitHub repository containing a valid skill (has `SKILL.md` with frontmatter)
- The skill must pass a security audit (verdict: `pass` or `warning`, not `dangerous`)

### Steps

1. **Fork this repository**

2. **Create a manifest file** at `manifests/{your-github-username}/{skill-name}.json`

3. **Fill in the manifest fields:**

   ```json
   {
     "name": "my-skill",
     "author": "your-github-username",
     "description": "One-line description of what the skill does",
     "repository": "https://github.com/your-github-username/your-repo",
     "commit": "full-40-char-commit-sha-pinned-at-publish",
     "version": "1.0.0",
     "license": "MIT",
     "tags": ["category1", "category2"],
     "security_verdict": "pass",
     "published_at": "2026-01-01T00:00:00Z"
   }
   ```

4. **Open a pull request** targeting `main`

5. **CI will automatically:**
   - Validate your manifest against the JSON schema
   - Verify the `author` field matches your GitHub username
   - Check for duplicate entries
   - Run typosquat detection against existing skill names
   - Reject manifests with `security_verdict: dangerous`

6. **Wait for review** — maintainers will review and merge approved submissions

### Automated Publishing

Use `asm publish` (coming in v2.0) to automate steps 2-4:

```bash
asm publish my-skill
```

## Schema Reference

All manifests must conform to `schema/manifest.v1.json` (JSON Schema draft-07).

| Field              | Type     | Required | Description                                        |
| ------------------ | -------- | -------- | -------------------------------------------------- |
| `name`             | string   | Yes      | Bare skill name, lowercase, alphanumeric + hyphens |
| `author`           | string   | Yes      | GitHub username of the publisher                   |
| `description`      | string   | Yes      | One-line description                               |
| `repository`       | string   | Yes      | Full GitHub URL                                    |
| `commit`           | string   | Yes      | Pinned 40-character commit SHA                     |
| `version`          | string   | No       | Semantic version                                   |
| `license`          | string   | No       | SPDX identifier                                    |
| `tags`             | string[] | No       | Category tags (max 10)                             |
| `security_verdict` | enum     | Yes      | `pass`, `warning`, or `dangerous`                  |
| `published_at`     | string   | Yes      | ISO 8601 timestamp                                 |
| `checksum`         | string   | No       | Reserved for future use                            |

## Review Criteria

1. **Schema compliance** — manifest must pass JSON Schema validation
2. **Security** — skills with `dangerous` verdict are rejected
3. **Identity** — the manifest `author` must match the PR author
4. **Uniqueness** — no duplicate author/name/commit combinations
5. **Naming** — names too similar to existing skills are flagged for review

## Review SLA

- Initial review within 48 hours for conforming submissions
- Submissions that fail CI are not reviewed until issues are fixed

## Updating a Published Skill

To update a skill (new version or commit), submit a PR that modifies your existing
manifest file with the new `commit`, `version`, and `published_at` values.

## Takedown Policy

Skills may be removed if they:

- Contain malicious code discovered after publication
- Violate the security policy
- Impersonate another author or skill
- Are reported for abuse

Takedown requests: open an issue with the `takedown` label.
