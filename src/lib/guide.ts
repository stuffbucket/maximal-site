// Canonical order, titles, and one-line descriptions for the user guide at /guide.
// The Markdown source lives in docs/guide/*.md (see src/content.config.ts).
// Keep in sync with docs/guide/README.md.
export const GUIDE_NAV = [
  {
    slug: "overview",
    title: "What is maximal?",
    blurb: "What maximal does, what it requires, and how the pieces fit together.",
  },
  {
    slug: "install",
    title: "Install maximal",
    blurb: "Install on macOS, Windows, or Linux.",
  },
  {
    slug: "connect-copilot",
    title: "Connect GitHub Copilot",
    blurb: "Sign in with a GitHub CLI account or a device code, and switch accounts.",
  },
  {
    slug: "connect-your-tools",
    title: "Connect your tools",
    blurb: "Configure Claude Code, Claude Desktop, Codex, opencode, and Work IQ (MCP).",
  },
  {
    slug: "how-it-works",
    title: "How maximal works",
    blurb: "How the local API proxy, config management, and MCP broker operate.",
  },
  {
    slug: "usage-and-settings",
    title: "Usage and settings",
    blurb: "Reference for the five Settings tabs and the Usage Dashboard.",
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting and FAQ",
    blurb: "Fixes for common authentication, config, and MCP request issues.",
  },
] as const;

export function guideTitle(slug: string): string {
  return GUIDE_NAV.find((n) => n.slug === slug)?.title ?? slug;
}
