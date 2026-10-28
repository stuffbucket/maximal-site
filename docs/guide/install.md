# Install maximal

Install maximal on macOS, Windows, or Linux, then head to [Connect GitHub Copilot](./connect-copilot) and [Connect your tools](./connect-your-tools).

## What you need

- **An active GitHub Copilot subscription** (Individual, Business, or Enterprise).
- **macOS on Apple Silicon** (M1 or newer), **Windows 10/11 (64-bit)**, or **Linux** (`x86_64` or `arm64`).

## Install on macOS

1. Download the `.dmg` from the [home page](https://stuffbucket.github.io/maximal-site/) or the [releases page](https://github.com/stuffbucket/maximal/releases).
2. Open the `.dmg` and drag **maximal** into your **Applications** folder.
3. Open **maximal** from Applications. It stays in your menu bar and Dock while running.

> **First launch on macOS:** if macOS blocks the app because it is a pre-release build, right-click **maximal** in Applications, choose **Open**, and confirm.

## Install on Windows

1. Download the Windows installer (`.exe` or `.msi`) from the [home page](https://stuffbucket.github.io/maximal-site/) or the [releases page](https://github.com/stuffbucket/maximal/releases).
2. Run the installer and open **maximal** from the Start menu.
3. maximal stays in your system tray and taskbar while running.

> **First launch on Windows:** if SmartScreen shows &ldquo;Windows protected your PC,&rdquo; click **More info** and then **Run anyway**.

## Install on Linux

On Linux, maximal runs its local service alongside the same unified Settings and Dashboard interface in your browser (`http://127.0.0.1:4141/ui/settings/`), including full support for Claude Code, Codex, and the Microsoft **Work IQ** MCP broker:

1. Clone the repository and build the UI and isolated MCP broker with [Bun](https://bun.sh) and [mise](https://mise.jdx.dev):
   ```sh
   git clone https://github.com/stuffbucket/maximal
   cd maximal
   bun install --frozen-lockfile --ignore-scripts
   (cd shell && bun install --frozen-lockfile --ignore-scripts)
   bun run ensure:ui-embed
   bun run build:ui
   bun run build
   mise -C packages/mcp-broker exec -- pnpm install --frozen-lockfile
   mise -C packages/mcp-broker exec -- pnpm build
   ```
2. Start maximal and open `http://127.0.0.1:4141/ui/settings/` in your browser:
   ```sh
   HOST=127.0.0.1 NODE_ENV=production MAXIMAL_UI_DIST="$PWD/shell/dist/ui" \
     bun dist/main.js start --port 4141
   ```

## Next steps

1. **[Connect GitHub Copilot](./connect-copilot)** on the **Account** tab.
2. **[Connect your tools](./connect-your-tools)** on the **Integrations** tab.

---

## Want to know a bit more?

- **macOS CLI (Homebrew):** if you prefer the terminal on macOS, run `brew install stuffbucket/tap/maximal` and then `maximal setup` to sign in and verify your connection.
- **Windows PowerShell:** you can also install via PowerShell with `irm https://github.com/stuffbucket/maximal/releases/latest/download/install.ps1 | iex`.
- **Work IQ on Linux:** on Linux, run maximal under your normal desktop user session with a running D-Bus session and unlocked Secret Service keyring (such as GNOME Keyring) so Work IQ (`@microsoft/workiq`) can access its credential store via `DBUS_SESSION_BUS_ADDRESS`.
