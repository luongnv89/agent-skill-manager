import { useState, useEffect } from "react";
import { SearchBar } from "../components/SearchBar";
import { SkillCard } from "../components/SkillCard";
import {
  searchSkills,
  installSkill,
  getSkillIndex,
  parseSkillsFromJson,
  type Skill,
} from "../lib/tauri-commands";

export function Catalog() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSearchQuery] = useState("");

  useEffect(() => {
    loadSkillIndex();
  }, []);

  const loadSkillIndex = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSkillIndex();
      if (result.success) {
        const parsed = parseSkillsFromJson(result.stdout);
        setSkills(parsed.map((s) => ({ ...s, installed: false })));
      } else {
        setError("Failed to load skill index: " + result.stderr);
      }
    } catch (err) {
      setError("Error loading skill index: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadSkillIndex();
      return;
    }
    setLoading(true);
    try {
      const result = await searchSkills(query);
      if (result.success) {
        const parsed = parseSkillsFromJson(result.stdout);
        setSkills(parsed.map((s) => ({ ...s, installed: false })));
      }
    } catch (err) {
      setError("Search failed: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (name: string) => {
    try {
      const result = await installSkill(name);
      if (result.success) {
        setSkills((prev) =>
          prev.map((s) => (s.name === name ? { ...s, installed: true } : s)),
        );
      } else {
        setError("Install failed: " + result.stderr);
      }
    } catch (err) {
      setError("Install error: " + String(err));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Skill Catalog</h2>
        <SearchBar onSearch={handleSearch} placeholder="Search skills..." />
      </div>
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div className="loading">Loading skills...</div>
      ) : (
        <div className="skills-grid">
          {skills.length === 0 ? (
            <p className="empty-state">No skills found</p>
          ) : (
            skills.map((skill) => (
              <SkillCard
                key={skill.name}
                skill={skill}
                onInstall={handleInstall}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
