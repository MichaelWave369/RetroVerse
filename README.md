# RetroVerse

A real retro-computer time machine in your browser. **Six museum stations: DOS PC, DOS Game Cabinet, Tandy 1000 SL/2 compatibility, Macintosh 68k, Amiga, and the ScummVM adventure portal.**

RetroVerse starts with an IBM PC-compatible computer powered by [v86](https://github.com/copy/v86) and WebAssembly. It boots an actual DOS disk image, not a pretend terminal. A retro CRT desktop surrounds the live emulated computer.

## Rung 1

- Boot the openly distributable 720 KiB FreeDOS demo floppy, fetched **at build time**, validated and served from the same GitHub Pages origin. No runtime request to `i.copy.sh`.
- Choose MS-DOS 3.30, 5.0, 6.22 or other PC media, then supply your own authorized bootable floppy/hard-disk/CD image. Selecting a version is a label for the user's imported media, not an included Microsoft OS.
- Change memory size, power on/off, pause/resume, restart, send Ctrl+Alt+Del, insert/eject floppies and CDs, load local media.
- Save and restore emulator state (requires the same original disk image and emulator build); fullscreen screen and keyboard guidance.
- GitHub Actions builds the React site, checks types and publishes to GitHub Pages when main changes.

## Rung 2: DOS game cabinet

A separate real DOSBox-based game cabinet is now available through the browser, powered by the official [js-dos v8 player](https://js-dos.com/). It can launch the **official upstream Digger example** directly from the js-dos CDN, or a locally chosen `.jsdos` bundle (up to 256 MiB) supplied by the user. The emulator/player assets are fetched on demand from js-dos servers; no bundle is uploaded to our application. Local file-system persistence is supported by js-dos's browser storage. The game cabinet does not ship commercial games.

This Rung 2 integration is hosted via js-dos's maintained `latest` CDN rather than packaging GPL code into RetroVerse. That entails an internet dependency and possible upstream API drift, so production testing and a later pinned/self-hosted build are planned. js-dos retains its GPL-2.0 license; our application license does not supersede it.

## Rung 5: Personal DOS game vault

The DOS Game Cabinet now has a persistent, browser-local shelf for your own .jsdos game bundles. Select a bundle in the cabinet, choose **SAVE SELECTED BUNDLE**, and then PLAY, EXPORT or REMOVE it from the shelf. Data is stored as Blobs in IndexedDB and remains on the visitor's browser/device; RetroVerse does not receive or host the files. The shelf supports searching, a 128 MiB single-game limit and a 512 MiB local shelf limit (actual browser quota may be lower). Duplicate file names are allowed because users may own multiple versions.

**Risk and backup warning:** This storage is not encrypted or synced. Clearing website data, evictions, private browsing, or changing devices can delete it. Other scripts on the same origin may have IndexedDB access, including external player code loaded into the page. Use EXPORT and keep original files. Game saves are *separate* from the library's stored game bundles and remain managed by the js-dos runtime.

Adding to the shelf validates only filename extension and a ZIP-like header, not ownership, actual game compatibility, archive security, or freedom from malware. Run only trusted, legally usable game bundles.

**ScummVM self-hosting:** See [docs/scummvm-self-hosting.md](docs/scummvm-self-hosting.md) for a gated engineering plan. Rung 5 does not falsely claim the ScummVM WebAssembly engine has been built or hosted by RetroVerse.

## Rung 6: Portable DOS game shelf backups

The browser-local Game Vault can now export all saved `.jsdos` bundles into a single **RetroVerse ZIP backup** using [zip.js](https://github.com/gildas-lormeau/zip.js) (BSD-3-Clause). The archive has a versioned manifest and opaque game IDs, with original filenames and sizes. The ZIP is created locally; no RetroVerse backend receives game data.

Use **Back up entire shelf** to download and keep a copy, then **Restore backup ZIP** to import it into another browser. The importer validates the format, expected archive entries, game sizes, game ZIP headers and overall quotas. Imports append new entries instead of deleting the existing library. Importing twice creates duplicates; a failed import can leave already-restored games in place. The UI reports progress and errors. Memory usage and browser limits still affect large backups.

**Important:** Portable ZIP backups contain stored **game bundles only**. They do *not* include separate js-dos save files, v86 snapshots, Amiga ROMs, SCUMM game data, or emulator configuration. Continue exporting critical saves through each relevant emulator.

To run archive compatibility checks locally:

`npm test`

## Rung 7: Portable DOS save progress (owned games)

The DOS Game Cabinet uses [js-dos v8 custom file-system save hooks](https://js-dos.com/save-load-game-progress.html) for *user-provided .jsdos bundles*. When launching one, RetroVerse computes its SHA-256 digest and uses a stable key rather than the temporary Blob URL. File-system deltas are stored in a separate browser-local IndexedDB database. Identical .jsdos files retain the same save identity across browser sessions and game-shelf backup restores.

To export your own game progress, first save **inside the game**, click the cabinet **SAVE** control to persist the changed files, then choose **EXPORT PROGRESS**. This downloads a standalone versioned RetroVerse ZIP with a checksum-verified file-system-change bundle (not an emulator snapshot). To restore, select the same owned .jsdos game, choose **RESTORE PROGRESS**, and import the ZIP. The app checks archive integrity and the matching SHA-256 bundle identity, asks permission before replacing stored changes, and stops a running player **before** writing a replacement. Start the exact same game again to load the imported files.

**Scope and limitations:** This is first-pass save-file portability, not DOSBox-X quick-state portability. Games must support saving files themselves. Save changes are capped at 64 MiB. It is not bundled with the Rung 6 ZIP of game cartridges, so carry both files. Local changes remain unencrypted in browser origin storage and can be deleted when clearing site data. The custom hook behavior requires live browser tests after deployment. Previous saves created by the js-dos default storage are **not migrated automatically**. The upstream Digger demonstration deliberately retains its existing save behavior to avoid disrupting established progress.

## Rung 9: Macintosh Plus / System 6 via Infinite Mac

The sixth museum station embeds the **real third-party Infinite Mac emulator** using its [official embed API](https://infinitemac.org/embed-docs). The default Macintosh Plus preset runs System 6.0.8 with Mini vMac. Another preset uses a Quadra 650 with System 7.1 through Basilisk II. The visitor explicitly chooses to turn the system on before the iframe loads.

The React station provides boot/stop, restart, a system selector, status messages filtered to the trusted Infinite Mac iframe origin, and official full-page links as a fallback. If the iframe is slow or blocked, the original provider runs independently. A successful CI build proves the React station compiles but cannot guarantee remote guest boot.

**This is not a self-hosted Macintosh.** RetroVerse does not mirror Apple ROMs, system software, commercial applications or the Infinite Mac runtime. The third party controls downloads, saves, cookies and other data handling; users should review the provider before loading. Browser cross-origin-isolation restrictions may reduce performance.

References: [Infinite Mac](https://infinitemac.org), [embed generator](https://infinitemac.org/embed), [source](https://github.com/mihaip/infinite-mac). Our later roadmap can investigate independent builds with explicitly authorized ROM/media.

## Rung 8: Tandy 1000 SL/2

The fifth station provides a DOSBox Tandy-compatible graphics/audio profile and a local 720 KiB FAT12 floppy reader for user-authorized DOS files. **It is not a ROM-accurate recreation of an SL/2 motherboard** and does not bundle Tandy DOS 3.3/DeskMate. The historical [four-disk archive](https://archive.org/details/Tandy1000SL2Disks) is linked for reference only.

## Rung 3: classic Amiga

The Amiga station embeds the real [Scripted Amiga Emulator](https://github.com/naTmeg/ScriptedAmigaEmulator) (SAE) in a dedicated same-origin frame. The first implementation preserves its original control panel: choose a machine (A500, A1200 and more), supply your own **authorized** Kickstart ROM and ADF floppy images, then press Start in SAE. It provides pause, reset, mute and fullscreen options. The separate full-page link avoids awkward nested focus issues.

SAE is **GPL-2.0-or-later**. Build-time preparation downloads its original source and example UI pinned to upstream commit `8ebce7b8beb9ebe243e5ea7b5150b3f16f665303`; the complete JavaScript sources and GPL license are published within `/amiga/`. RetroVerse's surrounding React code is MIT-licensed; the embedded upstream SAE application retains GPL terms. No commercial Kickstart ROM, Workbench image or game is bundled. **You cannot boot without appropriate firmware.** Full browser compatibility must be manually verified after deploying.

## Rung 4: ScummVM adventure wing (external web demo)

The fourth station is a **real ScummVM WebAssembly player portal**, connected to the independent third-party project [chkuendig/scummvm-demo](https://github.com/chkuendig/scummvm-demo). The primary button opens its live player in a separate tab, where users can try the demos/freeware titles available on that service. An optional iframe view is provided for convenience but may fail if the external provider blocks framing or browsers restrict cross-origin functionality. The reliable default is the direct link, not a claim that ScummVM has been compiled and self-hosted by RetroVerse.

The room also includes a searchable reference index with **official freeware releases** identified on [ScummVM's own game downloads page](https://www.scummvm.org/games/) and selected classic commercial adventures labeled *bring your own game data*. Catalog cards do not individually launch a game, promise browser compatibility, or imply game data is included.

**Privacy:** clicking the external launch or enabling the iframe contacts the third-party demo provider. Game imports, cloud connections, and saves are handled by that service and its policies. No ScummVM binaries, ROMs or adventure data are downloaded or bundled by the RetroVerse build. ScummVM and its upstream demo retain their independent licenses. Future milestones may add a pinned self-hosted ScummVM WebAssembly build and native library management, after rights and technical review.

## Community Classics Wishlist

The DOS Game Cabinet contains a searchable, non-playable wishlist recording **46 entries from a community tally** supplied by the project owner (roughly 994 usable recommendations in the underlying discussion). `Another World / Flashback` was grouped by the original tally; it represents two individual games. The ranking is community-sourced, not an official compatibility or distribution entitlement. No listed commercial game is bundled. Future milestones will add curated links and playable **licensed** shareware demos after individually verifying redistribution rights, plus a user-owned game library. The source metadata is in `src/dosClassics.ts`.

## Play online

After the Pages workflow is enabled under **Settings → Pages → Build and deployment → GitHub Actions**, the default deployment target is:

**https://michaelwave369.github.io/RetroVerse/**

GitHub Pages is free static hosting; the browser executes the emulator. The build process downloads a pinned FreeDOS demo floppy from `copy/images`, verifies its Git blob identity and size, and hosts it at `media/freedos722.img` alongside the site. No cross-origin FreeDOS fetch occurs at runtime. Your own uploaded images stay in browser memory, not on a RetroVerse server.

## Local development

Requires Node.js 22+ and internet for first-time dependencies and legal open-firmware downloads.

    npm install
    npm run dev

For a production build:

    npm run build
    npm run preview

The `predev` and `prebuild` scripts copy the v86 WASM files, download pinned SeaBIOS/VGA BIOS into `public/vendor`, and download/verify the FreeDOS floppy into `public/media`. Generated assets are gitignored. CI checks that the built image is exactly 737,280 bytes; image downloads happen during builds, not at user boot.

## Architecture

- \`src/boot.ts\`: typed guest boot profiles and hardware configuration.
- \`src/App.tsx\`: browser emulator lifecycle, media controls, and React interface.
- \`src/styles.css\`: retro desktop and CRT-inspired UI.
- \`scripts/prepare-assets.mjs\`: reproducible open firmware + WASM preparation.
- \`.github/workflows/pages.yml\`: build + deploy pipeline.

## Roadmap

1. **DOS PC:** authentic boot, same-origin FreeDOS floppy, power controls, imported disk images, save states.
2. **Game cabinet:** js-dos launcher with official upstream demo, .jsdos imports, local saves, and a searchable Community Classics wishlist. Future: verified licensed demos, controller presets, self-hosted runtime.
3. **Amiga:** real SAE engine, selectable Amiga hardware, user-provided Kickstart/ADF media; future native controls and compatibility testing.
4. **Adventures:** external ScummVM WebAssembly demo launch, optional browser embedding and searchable freeware/owned-game index. Future: self-hosted build and native game library.
5. **Local Game Vault:** IndexedDB-backed DOS game shelf with play, export and remove; ScummVM self-hosting plan.
6. **Portable backups:** verified ZIP export/import of owned .jsdos game collections with format tests. Future: full save-game portability.
7. **Save progress:** SHA-256-bound DOS file-system deltas with independent verified ZIP export/import. Future: backward-compatible save migrations and quick-state support.
8. **Tandy SL/2:** compatible DOSBox Tandy graphics/audio, historic 720 KiB disk extraction.
9. **Macintosh 68k:** user-initiated official Infinite Mac embed with System 6 and 7 presets.
10. **Commodore 64:** evaluate a faithful browser C64 core and authorized user-supplied ROMs.
11. **IBM PC/XT 8088:** evaluate PCjs for more faithful original XT/MDA/CGA support than v86.
12. **Museum / XR:** browsable computer rooms connected with PhiCade and PhiOS XR.

## Licensing and safety

Application code: MIT. Emulation dependencies, BIOS firmware and operating-system images have their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No proprietary BIOS or commercial games are bundled. Do not upload disks containing material you cannot legally use.

**No guest networking is enabled by default.** Local files are loaded into memory and not sent to a RetroVerse backend.

Developed as part of the Φ369 Labs open computing ecosystem.
