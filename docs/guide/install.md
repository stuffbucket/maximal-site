# Install maximal

Install maximal on macOS, Windows, or Linux, then head to [Connect GitHub Copilot](./connect-copilot) and [Connect your tools](./connect-your-tools).

## What you need

- **An active GitHub Copilot subscription** (Individual, Business, or Enterprise).
- **macOS on Apple Silicon** (M1 or newer), **Windows 10/11 (64-bit)**, or **Linux**: Debian 13, Ubuntu 24.04, or Ubuntu 26.04, on `amd64` or `arm64`.

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

maximal installs from its own signed apt repository on **Debian 13**, **Ubuntu 24.04**, and **Ubuntu 26.04**, on `amd64` and `arm64`.

> **Packages are available from 0.5.0.** Until 0.5.0 ships, use `Suites: rc` instead of `Suites: stable` below.

1. Add the repository and install:
   ```sh
   sudo install -d -m 0755 /etc/apt/keyrings
   curl -fsSL https://mxml.sh/apt/maximal.asc | sudo tee /etc/apt/keyrings/maximal.asc >/dev/null
   sudo tee /etc/apt/sources.list.d/maximal.sources >/dev/null <<'EOF'
   Types: deb
   URIs: https://mxml.sh/apt
   Suites: stable
   Components: main
   Signed-By: /etc/apt/keyrings/maximal.asc
   EOF
   sudo apt update
   sudo apt install maximal-desktop   # desktop: tray app + proxy
   # or: sudo apt install maximal     # headless: proxy only
   ```
2. **Desktop:** open **Maximal** from your app menu. KDE shows the tray icon out of the box. GNOME needs the AppIndicator extension, which Ubuntu includes; on Debian, install `gnome-shell-extension-appindicator`. Settings also open in your browser at `http://127.0.0.1:4141/ui/settings/`.
3. **Headless:** sign in with `maximal auth`, then keep it running as a user service:
   ```sh
   systemctl --user enable --now maximal
   sudo loginctl enable-linger "$USER"
   ```

To update:

```sh
sudo apt update && sudo apt install --only-upgrade maximal maximal-desktop
```

For other distributions, building from source, and more detail, see the [full Linux guide](https://github.com/stuffbucket/maximal/blob/main/docs/linux.md).

## Next steps

1. **[Connect GitHub Copilot](./connect-copilot)** on the **Account** tab.
2. **[Connect your tools](./connect-your-tools)** on the **Integrations** tab.

---

## Want to know a bit more?

- **macOS CLI (Homebrew):** if you prefer the terminal on macOS, run `brew install stuffbucket/tap/maximal` and then `maximal setup` to sign in and verify your connection.
- **Windows PowerShell:** you can also install via PowerShell with `irm https://github.com/stuffbucket/maximal/releases/latest/download/install.ps1 | iex`.
- **Work IQ on Linux:** on Linux, run maximal under your normal desktop user session with a running D-Bus session and unlocked Secret Service keyring (such as GNOME Keyring) so Work IQ (`@microsoft/workiq`) can access its credential store via `DBUS_SESSION_BUS_ADDRESS`.
