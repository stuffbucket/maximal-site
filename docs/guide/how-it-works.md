# How maximal works

A quick look at what happens when you use maximal&mdash;first from your perspective using the app, and then a brief summary of what happens behind the scenes.

## What you do

1. **Keep maximal running.** When maximal is open on macOS or Windows, it sits quietly in your menu bar or system tray and in your Dock or taskbar.
2. **Sign in once with GitHub.** On the **Account** tab, you connect the GitHub account that carries your Copilot plan.
3. **Flip on the apps and connectors you use.** On the **Integrations** tab, you switch on **Claude Code**, **Claude Desktop**, **Codex**, and **Work IQ**.
4. **Use your tools normally.** Your tools work the same way they always do, using the models included in your GitHub Copilot subscription.

---

## Want to know a bit more?

If you&rsquo;re curious how maximal connects those pieces on your computer:

- **Local API translator (`127.0.0.1:4141`):** Claude Code and Claude Desktop speak Anthropic&rsquo;s API format, while Codex and `opencode` speak OpenAI&rsquo;s format. maximal listens locally on your computer (`http://127.0.0.1:4141`), accepts requests in either format, and forwards them to GitHub Copilot using your signed-in account.
- **Reversible app configuration:** when you turn an app switch **On**, maximal writes only the local settings needed to point that app at `127.0.0.1:4141` and saves a snapshot of your previous settings. Turning the switch **Off** puts your previous settings back. If you already had custom gateway settings in place, maximal leaves them alone and tells you on the card.
- **Built-in connectors:** **Work IQ** runs inside maximal and talks directly to Microsoft&rsquo;s hosted Work IQ service, so there&rsquo;s no separate program to install. maximal serves it to your apps as a local MCP server on the same address, and adds it to Claude Code as `maximal-workiq` when you check **Claude Code**.
- **Tool permissions in one place:** every Work IQ call passes through maximal, which applies your **Allowed**, **Asks**, and **Blocked** choices before the call reaches Microsoft. Blocked tools stay visible in your apps, turned off.
- **A sign-in kept safe:** your Work IQ sign-in is encrypted, with its key in your system&rsquo;s credential store, and is never shared with your apps.
