# What is maximal?

maximal is an app for macOS, Windows, and Linux that lets you run **Claude Code**, **Claude Desktop**, and **OpenAI Codex** on the models included in your **GitHub Copilot** subscription.

If you or your employer already pay for GitHub Copilot, you can use those tools without buying separate Anthropic or OpenAI subscriptions. You can also turn on Microsoft **Work IQ** in maximal to give Claude Code your Microsoft 365 context.

## What you need

- **An active GitHub Copilot plan** (Individual, Business, or Enterprise).
- **macOS (Apple Silicon)**, **Windows 10/11 (64-bit)**, or **Linux** (Debian 13, Ubuntu 24.04, or Ubuntu 26.04).
- One or more tools you want to use: **Claude Code**, **Claude Desktop**, **Codex**, or **Work IQ**.

## How setup works

1. **[Install maximal](./install.md).** Download the desktop app on macOS or Windows, or install it from maximal's apt repository on Linux.
2. **[Sign in to GitHub](./connect-copilot.md).** On the **Account** tab, connect your GitHub account with one click if you already use the GitHub CLI, or sign in with a short browser code.
3. **[Turn on your apps and Work IQ](./connect-your-tools.md).** On the **Integrations** tab:
   - Under **Apps**, flip on the switches for **Claude Code**, **Claude Desktop**, and **Codex**.
   - Under **Connectors**, open **Work IQ**, switch it on, sign in with your Microsoft 365 account, and check **Claude Code**.

The first time a request goes through maximal, you&rsquo;ll get a one-time notification confirming that your tool is connected.

---

## Want to know a bit more?

Behind the scenes, maximal runs a small local server on your computer (`http://127.0.0.1:4141`). When you flip a switch in **Integrations**, maximal points that tool&rsquo;s local settings at maximal and translates its requests to your GitHub Copilot plan. Turning the switch off restores your previous settings.

If you want to connect another tool manually (like `opencode` or your own scripts), or prefer using the command line (`brew install stuffbucket/tap/maximal`), see the bottom of [Connect your tools](./connect-your-tools.md) and [How maximal works](./how-it-works.md).
