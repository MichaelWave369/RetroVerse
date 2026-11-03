# RetroVerse

A real retro-computer time machine in your browser. **Nine museum stations: DOS PC, original IBM PC/XT 8088, DOS Game Cabinet, Tandy 1000 SL/2 compatibility, Windows 95/98, Macintosh 68k, Commodore 64, Amiga, and the ScummVM adventure portal.**

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

## Rung 15: The Time Hall · optional explorable history gallery

RetroVerse now includes an optional **Time Hall** museum experience. Select the small **EXPLORE TIME HALL** button next to the original compact machine tabs. The hall opens as a full-screen, accessible overlay, with a CSS perspective corridor, nine unique computer exhibits, period plaques, hardware-inspired visual displays and a chronological timeline. Select a door or press Left/Right arrows to walk between eras. **ENTER THIS COMPUTER** closes the hall and takes you straight to the real existing emulator station.

**Screen-first default preserved:** The Time Hall is **closed by default**; no giant gallery is inserted ahead of the emulator. The compact station tabs stay usable and the computer display remains near the top of the page. Merely opening the hall does not launch, iframe, preload or contact any third-party emulator. Its hardware visuals are CSS illustrations, **not fake playable software** and not an actual walkable 3D/VR/WebXR engine.

**Accessibility:** Keyboard controls (Left/Right to change exhibits, Tab/Shift+Tab inside the dialog, Escape to close), clickable previous/next doors, scrollable timeline for smaller screens, screen-reader labels, focus restoration, reduced-motion behavior and a focus-trapped modal. The time-hall gallery is implemented with local React/CSS and adds no large runtime dependency.

**Exhibit stamps:** Entered station IDs are saved in browser-local `localStorage` at `retroverse:timehall:visits:v1`, with validation and de-duplication of stored IDs. The gallery displays visited counts and offers **RESET VISIT STAMPS** with confirmation. If storage is blocked, the museum still works and visit stamps persist for the current browser tab only. No analytics, cloud accounts or uploads.

**Scope and honesty:** The historical timeline is an educational *curation*, not a literal model of hardware generations: for example, the DOS station is displayed as the 1990s DOS era despite using a later v86 x86 machine, while the original IBM PC/XT is correctly situated in 1981–83. Externally hosted, local and compatibility-based emulator experiences are labeled separately. Existing media/ROM/rights policies are unchanged. A real WebXR gallery with Quest 3 controls remains a separate future milestone.

**QA:** Check the nine unique doors, chronological order, mobile horizontal timeline, visited stamps, navigation to every existing station, and focus handling. Switching from an active DOS/Windows guest still follows the existing safety checks before unmounting a live machine. The pure inventory and route model has five new automated tests; UI exploration needs manual browser testing after deployment.

## Rung 14: Verify your Windows 9x disk download and restore it

After exporting an updated Windows 95/98 hard disk, RetroVerse can **verify the actual file downloaded by the browser** before you rely on it. This checks *every byte*, not merely the filename or file size, while loading at most two 4 MiB slices into RAM at once. No disk content is uploaded and no external backend is needed.

1. Use your own authorized raw Windows disk and save a small test file inside the emulated Windows machine. Shut down the guest within Windows if possible to flush its filesystem.
2. Choose **EXPORT UPDATED HARD DISK (.IMG)**. Wait until your browser has fully downloaded the file. The emulator pauses.
3. Choose **SELECT DOWNLOADED .IMG TO VERIFY**, and select that completed download from your Downloads directory. RetroVerse reads it and compares every byte to the in-session export. A size mismatch, corruption, truncation or canceled verification is rejected.
4. Once verification reports success, power the virtual PC off. Use **USE VERIFIED DISK ON NEXT BOOT**, then power it on again with the verified updated disk. Check in Windows that the saved test file actually exists.
5. Keep an independent backup of the verified downloaded image.

**Boundaries:** Byte-for-byte identity means the download matches the image created in this RetroVerse session. It **does not** prove a Windows guest had flushed its files to disk, that all v86 modified sectors were correctly assembled, or that a copied operating system will boot successfully. Verification is intentionally available only for the last exported image in the current browser session; refreshing or selecting a new source disk clears the in-memory export reference. Up to 2 GiB of file data may be read twice, in bounded chunks, so this can take time. Browser tests with expendable 9x images are still needed before trusting important data.

**Automated tests:** Exact multi-chunk comparisons, corrupted same-size files, truncated/expanded downloads, invalid inputs, cancellation and failed-comparison progress. Rung 14 does not add any Microsoft software or other copyrighted media to RetroVerse.

## Rung 13: Export your updated Windows 95/98 hard disk

This rung upgrades the real Windows 9x v86 room with **Export Updated Hard Disk (.img)** so a visitor can keep the files and games written to a user-owned guest hard disk across sessions. The original disk remains unchanged; the browser assembles a **new full-size raw disk image** by combining original File slices with sectors modified by the running emulator.

**How to use:**

1. Select your own authorized, already bootable raw Windows 95/98 hard disk, then boot the guest.
2. Save files in Windows. Prefer shutting down **inside Windows** before exporting, so its filesystem has flushed changes.
3. Select **EXPORT UPDATED HARD DISK (.IMG)**. The app confirms, pauses the v86 instance, verifies that the private disk backend still corresponds to the exact selected File, and requests a browser download.
4. **Verify the download completed** and that its size matches the source disk (32 MiB–2 GiB). Keep this file with your own backups.
5. On your next visit, select that **exported updated .img as the new boot hard disk** and boot again. Never assume the original input file changed.

**Important technical boundaries:** v86 does not publish a stable public `get_hda_image` method for demand-paged disks. This feature uses the file-backed `AsyncFileBuffer.get_as_file` API via the checked `v86.cpu.devices.ide.primary.master.buffer` internal object. Runtime guards reject unsupported backend shapes, absent dirty-sector tracking, source-File mismatches, and truncated export results. The implementation is based on v86's upstream internals and could change in a future version. Files are assembled from original slices plus in-memory dirty blocks, without copying a 2 GiB raw image into one ArrayBuffer. This is a *downloadable full image*, **not** automatic browser autosave, cloud backup, an incremental patch, or write-back to the original file.

**Save reliability:** The browser may need ample memory and storage to download large images. A successful click is only a *download request*. Until it finishes, disk writes are vulnerable if the page closes. The VM stays paused after export, allowing a user to verify the file before leaving. The engine is internal and not end-to-end validated against real Windows guest files by automated CI: manually test with expendable images, write a file in Windows, export after guest shutdown, boot the updated image in a new session and verify the file is present. Do not rely on this for important data before the test passes.

No Windows binaries, Microsoft media, product keys or game files are added. The disk stays on the visitor's own device; there is no RetroVerse file upload or guest network relay.

## Rung 12: Windows 95/98 via first-party v86 (bring your own disk)

The ninth station runs a real browser-local Windows 9x-compatible virtual PC using the v86 engine already shipped in RetroVerse. No Microsoft Windows, installer media or product keys are included. The station displays a clearly marked decorative standby screen until the visitor starts the real emulator.

- Choose Windows 95 or Windows 98. The upstream v86 guide recommends Windows 95 OSR2-family or Windows 98 Second Edition.
- Bring an already bootable, preinstalled and legally usable raw hard disk: IMG, IMA, RAW or BIN, 32 MiB to 2 GiB, sector-aligned. VHD, VDI and QCOW2 containers are not supported. The disk is attached as an asynchronous browser File image. The file-backed v86 backend loads slices on demand without buffering the entire image at startup. Chrome or Edge is recommended.
- Attach an optional boot floppy or installation ISO, and exchange them with machine controls after boot. Windows Setup may need extra drivers, manual partitioning and a lengthy process; preinstalled guest media are recommended.
- Select 32, 64 or 128 MiB of RAM, and use power, pause/resume, reboot, fullscreen or Ctrl+Alt+Del. Existing open SeaBIOS/v86 WASM assets run locally, without any guest network relay.
- Switching museum stations while a Windows guest is active prompts before shutting it down.

**Export changes before powering off:** Rung 13 adds an explicit updated-disk download for guest file changes. The original source File is never overwritten. Re-select the exported updated .img on your next visit. Do not rely on it for irreplaceable data until actual Windows browser boots and restored file changes have been tested. A VM CPU snapshot alone is not a disk backup.

More information: https://github.com/copy/v86/blob/master/docs/windows-9x.md (official Windows 9x guest preparation guidance). The Windows installation and license remain the user's responsibility. Automated tests verify app config and media validation; live Windows boot still requires manual testing with an authorized guest image.

## Rung 11: Original IBM PC/XT 8088 room

The eighth station adds four real, historically configured IBM 8088 machines provided by the independent [PCjs](https://www.pcjs.org/) project:

- IBM PC XT (5160) in **CGA color** or **MDA monochrome**. Official configurations have an Intel 8088 at 4.77 MHz, 256 KB RAM, and a 10 MB hard disk.
- IBM PC (5150) in **CGA color** or **MDA monochrome**. Official configurations have a 4.77 MHz Intel 8088, 64 KB RAM and dual floppy drives.

Unlike RetroVerse's earlier v86-based PC, **PCjs explicitly models original IBM 5150/5160 hardware**, including display adapters and ROM-dependent configuration. We use verified official URLs, a selectable model, a prominent full-page launch for playable emulation, and an optional *experimental* remote iframe. The iframe is opened only on the visitor's request and its loading does **not** prove the 8088 machine has booted. PCjs or the browser may block embedding with cross-origin security headers; the full-page machine is always the recommended and supported option. PCjs hosts the emulator and any ROM/disk resources. RetroVerse does not download, mirror or redistribute any IBM ROM, Microsoft DOS disk image or PCjs runtime. Media selection, disk handling, and saves happen within the PCjs provider context, not RetroVerse's Game Vault.

**Attribution:** PCjs © 2012–2026 Jeff Parsons; [MIT project source](https://github.com/jeffpar/pcjs). Its licensing requires that copyright attribution remain visible on the page when PCjs is used.

**Verification:** Automated tests enforce exact official machine URLs and hardware reference metadata. After green CI and Pages deployment, open full-page PCjs and check the BIOS/guest boot, then try color and monochrome configurations. Test optional inline mode separately. React TypeScript and production builds cannot confirm third-party boot. The compact navigation row has been updated for **eight stations** so the extra button does not reintroduce the original scrolling problem.

## Rung 10: Screen-first compact navigation and Commodore 64

**Screen-first navigation:** The old 86px header, giant hero, and 218px machine-selector cards made users scroll through a landing page before they could see the actual emulator. Rung 10 replaces these with a small header, a compact hero and a single horizontal row of machine buttons, responsive to narrow mobile screens by horizontal scrolling. Switching stations automatically scrolls the active workstation into view. The page does not auto-scroll on first load. The workstation layout and media controls are otherwise retained.

**Commodore 64 station:** Provides a clear full-page launch to the real [C64 READY](https://c64ready.com/) 6510/VIC-II/SID browser emulator, with an **optional experimental iframe** that is only loaded on visitor request. The emulator's own features include keyboard/joystick input, user-supplied disks/tapes/programs, audio and local save states. It requires legally obtained ROMs: KERNAL (8 KiB), BASIC (8 KiB), CHARGEN (4 KiB), with 1541 DOS (16 KiB) optional for true-drive emulation. The [setup guide](https://c64ready.com/docs/getting-started) explains import from legal ROM files or a VICE folder.

**Technical limitation:** C64 READY relies on SharedArrayBuffer with cross-origin isolation. Its host sets COOP and COEP headers; embedding into an unrelated GitHub Pages origin **may fail**. RetroVerse therefore recommends the full-page link as the reliable path. Loading an iframe is not proof of actual guest boot. The provider remains separate and independently hosted, and retains ROM/media/storage responsibility.

**Licensing and data:** C64 READY is [GPL-3.0-or-later](https://github.com/mortyeriksen/c64ready). RetroVerse only links to or optionally embeds it and does not bundle emulator code, copyrighted ROMs, game images or save states. ROMs and saves entered into the provider's UI are managed by the provider's browser origin, not our Game Vault.

**Acceptance:** Run the existing automated ZIP/FAT12/ROM-related unit tests and the new provider URL tests; typecheck and build must pass. After merge and Pages deployment, confirm the homepage screen is visible quickly on desktop/mobile, selectors remain keyboard accessible, and the official C64 full-page player starts after users import their authorized ROMs. Try optional iframe to determine actual browser embedding viability.

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
10. **Commodore 64:** independent real C64 READY browser emulator portal, optional experimental embed, user-supplied ROMs and licensed media. Future: first-party runtime after GPL and COOP/COEP review.
11. **IBM PC/XT 8088:** a real PCjs-hosted IBM 5150/5160 hardware emulator portal, with four presets and an optional experimental embed. Future: independently hosted emulator after media and licensing reviews.
12. **Windows 95/98:** real v86 guest with user-owned raw disks and optional floppy/ISO media.
13. **Windows disk export:** save guest-written files by downloading a new updated raw image, guarded against incompatible v86 internals. Future: tested automatic, incremental backups.
14. **Windows download verification:** compare an actual browser-downloaded updated image byte-for-byte and select a verified image for next boot.
15. **Time Hall museum:** optional CSS-perspective nine-exhibit history corridor, keyboard navigation, portable screen-first layout and browser-local visit stamps.
16. **Future XR museum:** real walkable WebXR rooms and Quest 3 control integration, using the existing emulator stations rather than duplicating their engines.

## Licensing and safety

Application code: MIT. Emulation dependencies, BIOS firmware and operating-system images have their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No proprietary BIOS or commercial games are bundled. Do not upload disks containing material you cannot legally use.

**No guest networking is enabled by default.** Local files are loaded into memory and not sent to a RetroVerse backend.

Developed as part of the Φ369 Labs open computing ecosystem.
