# What is maximal?

maximal is an app for macOS, Windows, and Linux that lets you run **Claude Code**, **Claude Desktop**, and **OpenAI Codex** on the models included in your **GitHub Copilot** subscription.

If you or your employer already pay for GitHub Copilot, you can use those tools without buying separate Anthropic or OpenAI subscriptions. You can also turn on Microsoft **Work IQ** once in maximal to share Microsoft 365 context across your apps.

## What you need

- **An active GitHub Copilot plan** (Individual, Business, or Enterprise).
- **macOS (Apple Silicon)**, **Windows 10/11 (64-bit)**, or **Linux**.
- One or more tools you want to use: **Claude Code**, **Claude Desktop**, **Codex**, or **Work IQ**.

## How setup works

1. **[Install maximal](./install.md).** Open the desktop app on macOS or Windows, or start maximal on Linux and open its local web interface.
2. **[Sign in to GitHub](./connect-copilot.md).** On the **Account** tab, connect your GitHub account with one click if you already use the GitHub CLI, or sign in with a short browser code.
3. **[Turn on your apps and Work IQ](./connect-your-tools.md).** On the **Integrations** tab:
   - Under **Apps**, flip on the switches for **Claude Code**, **Claude Desktop**, and **Codex**.
   - Under **MCP servers**, add **Work IQ** and flip it on to share it across Claude Code and Claude Desktop.
   - Under **Requests**, answer form or sign-in link prompts when an app like Claude Desktop cannot show them directly.

The first time a request goes through maximal, you&rsquo;ll get a one-time notification confirming that your tool is connected.

---

## Want to know a bit more?

Behind the scenes, maximal runs a small local server on your computer (`http://127.0.0.1:4141`). When you flip a switch in **Integrations**, maximal points that tool&rsquo;s local settings at maximal and translates its requests to your GitHub Copilot plan. Turning the switch off restores your previous settings.

If you want to connect another tool manually (like `opencode` or your own scripts), or prefer using the command line (`brew install stuffbucket/tap/maximal`), see the bottom of [Connect your tools](./connect-your-tools.md) and [How maximal works](./how-it-works.md).
