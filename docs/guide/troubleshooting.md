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
- **If the Codex card says &ldquo;Manual cleanup required&rdquo;:** open `~/.codex/config.toml`, remove the section between `# >>> maximal codex routing v1:` and `# <<< maximal codex routing`, then switch **Codex** on again.

## &ldquo;Enabling this app was refused&rdquo;

If an app already has its own custom gateway settings configured, maximal won&rsquo;t overwrite them. The card in **Integrations → Apps** tells you which setting conflicted so you can clear it in that tool first, then flip the switch on again.

## Work IQ won&rsquo;t connect

Open **Integrations → Connectors → Work IQ**. The status explains what&rsquo;s wrong; fix the cause, then click **Try again**:

- **&ldquo;Your organization has not approved Work IQ&rdquo;** or **&ldquo;Your account is not assigned&rdquo;** — your Microsoft Entra admin needs to approve Work IQ for your organization or assign you to it.
- **&ldquo;Your account is not licensed for Work IQ&rdquo;** — ask your Microsoft 365 admin for a license that includes Work IQ (Microsoft 365 Copilot).
- **Sign-in timed out** — finish signing in within 5 minutes of clicking **Sign in**.
- **Sign-in needs local port 12798** — another program is using that port. Quit it, then try again.

## Work IQ&rsquo;s tools don&rsquo;t show up in Claude Code

- **Check the app:** on the Work IQ page, make sure **Claude Code** is checked under **Connect to apps**, and that **Claude Code** is switched on under **Apps**.
- **Start a new Claude Code session:** Claude Code picks up Work IQ in sessions started after you turn it on.
- **If the page says Claude Code already has its own Work IQ:** maximal doesn&rsquo;t add a second one. Remove the other Work IQ server or plugin from Claude Code to use maximal&rsquo;s.

## A Work IQ tool is refused

- **&ldquo;turned off in Maximal&rdquo;** — the tool is **Blocked**. Change it under **Tool permissions** on the Work IQ page.
- **&ldquo;needs your approval for each call, and this app can&rsquo;t ask for it&rdquo;** — the tool is set to **Asks**, and the app you&rsquo;re using (like Codex) can&rsquo;t ask you. Set it to **Allowed**, or use Claude Code, which asks you itself.

## &ldquo;Sign-in won&rsquo;t be saved&rdquo;

maximal keeps your Work IQ sign-in encrypted with a key in your system&rsquo;s credential store. If the store doesn&rsquo;t respond, you stay signed in only until maximal restarts. On Linux, install a keyring (`sudo apt install gnome-keyring libsecret-1-0`) and restart maximal; see [Install](./install.md#install-on-linux).

## Frequently asked questions

**Do I need an Anthropic or OpenAI API key?**
No. maximal uses the models included in your GitHub Copilot subscription.

**Which tools have a one-click switch?**
**Claude Code**, **Claude Desktop**, and **OpenAI Codex (CLI and Desktop)** all have switches in **Integrations → Apps**.

**Which apps can use Work IQ?**
maximal adds Work IQ to **Claude Code** for you. Other apps that support MCP servers can add the address shown on the Work IQ page by hand; see [Connect your tools](./connect-your-tools.md#want-to-know-a-bit-more).

**I used Work IQ in maximal 0.5. What changed?**
Work IQ is now built in, under **Integrations → Connectors**, with nothing to install. Your on/off choice and your Claude Code choice carry over; open the Work IQ page to accept the terms and sign in. maximal no longer adds Work IQ to Claude Desktop.

**Does signing out of maximal log me out of GitHub?**
No. Signing out or removing an account in **Account** only removes maximal&rsquo;s saved login.

**How do I hide maximal from my Dock or taskbar?**
Open the **Appearance** tab and turn off **Always show in Dock / taskbar**. maximal will stay in your menu bar or system tray when its window is closed.

---

## Want to know a bit more?

- **Connecting manual tools (`opencode`, scripts) across restarts:** the default key shown in **Integrations → Endpoint** changes when maximal restarts. For any tool you configure by hand, click **+ Add a connection** under **Integrations → API keys** to create a named key that never changes.
- **GitHub Enterprise (`*.ghe.com`):** if your company uses a custom GitHub Enterprise Cloud data-residency URL, set `COPILOT_API_ENTERPRISE_URL` in your environment before signing in.
- **CLI diagnostics:** if you installed the command-line tool, run `maximal setup` to test your connection or `maximal debug` to print a secret-safe diagnostic summary.
