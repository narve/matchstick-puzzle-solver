# Playwright MCP — install & usage gotchas

The repo has four Playwright MCP servers configured in `.mcp.json`:
`playwright` (chromium), `playwright-firefox`, `playwright-webkit`,
`playwright-edge` (uses system `/opt/microsoft/msedge/msedge`).

## Installing browsers

Each MCP server (except edge) needs its own browser binary in
`~/.cache/ms-playwright/`. Install with:

```fish
npx @playwright/mcp install-browser chrome-for-testing
npx @playwright/mcp install-browser firefox
npx @playwright/mcp install-browser webkit
```

**Run them sequentially, never in parallel.** Playwright takes a
filesystem lock at `~/.cache/ms-playwright/__dirlock` during install.
Parallel installs leave the lock orphaned and silently kill each other.
If you see "install in progress" but no `node` processes, delete the
lock and retry:

```fish
rm -rf ~/.cache/ms-playwright/__dirlock
```

`install-browser` takes **one** positional browser name. Passing two
(`install-browser firefox webkit`) installs only the first, then hangs.
There is no `--executable-path` flag for `install-browser`.

The "npm install your project's dependencies first" warning is generic
template noise — `@playwright/mcp install-browser` does not require a
`package.json`. It can be ignored.

## Checking install state

```fish
# Is something installing right now?
pgrep -fa "install-browser|playwright-mcp install|oopBrowserDownload"

# What's installed?
ls ~/.cache/ms-playwright/ | grep -iE "firefox|chrom|webkit"

# Lock held?
ls ~/.cache/ms-playwright/__dirlock 2>/dev/null && echo "lock held"
```

## Linux compatibility

Playwright downloads "fallback build for ubuntu24.04-x64" on non-Ubuntu
distros (Arch, CachyOS, etc.). It almost always works — newer glibc is
fine. WebKit occasionally needs extra system libs (`libwoff`,
`libenchant`, gstreamer plugins); chromium and firefox usually run
without extras.

## Edge MCP quirks

- No install needed — uses the system msedge binary configured via
  `--executable-path` in `.mcp.json`.
- **Blocks `file://` URLs.** To screenshot a local file with edge, serve
  it over HTTP first:

  ```fish
  python3 -m http.server 8765
  # then navigate to http://localhost:8765/media.html
  ```

## Reconnecting after a kill

If you `pkill` the install processes, the **MCP servers also die** —
their parent `node playwright-mcp --browser ...` processes were
children of the same npx tree. Reconnect via `/mcp` in Claude Code
before any browser tool will work again.
