# Troubleshooting and FAQ

Quick fixes for the most common snags, followed by a short section for manual and CLI setups.

## Quick checklist

1. **maximal is open:** check for maximal in your menu bar or system tray, or in your Dock or taskbar.
2. **You are signed in:** open the **Account** tab and make sure it says **Connected** next to your GitHub username.
3. **Your app switch is on:** open the **Integrations** tab and check that **Claude Code**, **Claude Desktop**, or **Codex** is switched **On** under **Apps**.

## &ldquo;I&rsquo;m signed in, but my tool gets errors&rdquo;

- **Check the Account tab:** if GitHub Copilot turns a request away (for example, if your account doesn&rsquo;t have an active Copilot plan, or needs updated terms or billing), maximal shows a banner on the **Account** tab with a link to fix it on GitHub.
- **Check your Copilot quota:** click the chart icon in the top-right corner (`⌘D` or `Ctrl+D`) and check **Usage Quotas** to see if your *Premium Interactions* quota is used up for the month.

## Codex isn&rsquo;t using maximal after flipping its switch

- **Restart Codex and start a new session:** after turning **Codex** on or off in **Integrations → Apps**, quit and reopen Codex (CLI or Desktop) and start a new local session so it picks up the change.
- **If the Codex card says &ldquo;Manual cleanup required&rdquo;:** open `~/.codex/config.toml`, remove the `# >>> maximal codex start >>>` … `# <<< maximal codex end <<<` section, and click **Re-scan**.

## &ldquo;Enabling this app was refused&rdquo;

If an app already has its own custom gateway settings configured, maximal won&rsquo;t overwrite them. The card in **Integrations → Apps** tells you which setting conflicted so you can clear it in that tool first, then flip the switch on again.

## Work IQ is waiting or hanging in Claude Desktop

Sometimes **Work IQ** (or another MCP server) asks you to fill out a form or open a sign-in link during a request. Because Claude Desktop can&rsquo;t show that prompt itself, maximal holds it for you:

1. Open **Integrations → Requests** (or click **Answer requests…** from maximal&rsquo;s menu bar or Dock icon).
2. Click **Answer…** or **Review link…** before the 5-minute timer runs out.

## Frequently asked questions

**Do I need an Anthropic or OpenAI API key?**
No. maximal uses the models included in your GitHub Copilot subscription.

**Which tools have a one-click switch?**
**Claude Code**, **Claude Desktop**, and **OpenAI Codex (CLI and Desktop)** all have switches in **Integrations → Apps**.

**How do I share Work IQ across Claude Code and Claude Desktop?**
In **Integrations → MCP servers**, click **Add** on **Work IQ** under **Available to add** (if Work IQ isn&rsquo;t installed yet, copy the install command on the card first and click **Re-scan**), flip it **On**, and check **Claude Code** and **Claude Desktop**.

**Does signing out of maximal log me out of GitHub?**
No. Signing out or removing an account in **Account** only removes maximal&rsquo;s saved login.

**How do I hide maximal from my Dock or taskbar?**
Open the **Appearance** tab and turn off **Always show in Dock / taskbar**. maximal will stay in your menu bar or system tray when its window is closed.

---

## Want to know a bit more?

- **Connecting manual tools (`opencode`, scripts) across restarts:** the default key shown in **Models & keys → Endpoint** changes when maximal restarts. For any tool you configure by hand, click **+ Add a connection** under **Models & keys → API keys** to create a named key that never changes.
- **GitHub Enterprise (`*.ghe.com`):** if your company uses a custom GitHub Enterprise Cloud data-residency URL, set `COPILOT_API_ENTERPRISE_URL` in your environment before signing in.
- **CLI diagnostics:** if you installed the command-line tool, run `maximal setup` to test your connection or `maximal debug` to print a secret-safe diagnostic summary.
