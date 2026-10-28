# How maximal works

A quick look at what happens when you use maximal&mdash;first from your perspective using the app, and then a brief summary of what happens behind the scenes.

## What you do

1. **Keep maximal running.** When maximal is open on macOS or Windows, it sits quietly in your menu bar or system tray and in your Dock or taskbar.
2. **Sign in once with GitHub.** On the **Account** tab, you connect the GitHub account that carries your Copilot plan.
3. **Flip on the apps and MCP servers you use.** On the **Integrations** tab, you switch on **Claude Code**, **Claude Desktop**, **Codex**, and **Work IQ**.
4. **Use your tools normally.** Your tools work the same way they always do, using the models included in your GitHub Copilot subscription.

---

## Want to know a bit more?

If you&rsquo;re curious how maximal connects those pieces on your computer:

- **Local API translator (`127.0.0.1:4141`):** Claude Code and Claude Desktop speak Anthropic&rsquo;s API format, while Codex and `opencode` speak OpenAI&rsquo;s format. maximal listens locally on your computer (`http://127.0.0.1:4141`), accepts requests in either format, and forwards them to GitHub Copilot using your signed-in account.
- **Reversible app configuration:** when you turn an app switch **On**, maximal writes only the local settings needed to point that app at `127.0.0.1:4141` and saves a snapshot of your previous settings. Turning the switch **Off** puts your previous settings back. If you already had custom gateway settings in place, maximal leaves them alone and tells you on the card.
- **Isolated MCP server sessions:** when you turn on **Work IQ** (or another MCP server) in **Integrations → MCP servers**, maximal runs a separate local server session for each connected app window so they don&rsquo;t collide. When you turn the switch off or quit maximal, it removes the entries it added.
- **Catching interactive prompts:** if an MCP server asks you for a form or a sign-in link and the app you&rsquo;re using (like Claude Desktop) can&rsquo;t display that prompt itself, maximal holds the prompt in **Integrations → Requests** and notifies you so you can answer it.
