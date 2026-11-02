# RetroVerse

A real retro-computer time machine in your browser. **Rungs 1–2: DOS PC + Game Cabinet.**

RetroVerse starts with an IBM PC-compatible computer powered by [v86](https://github.com/copy/v86) and WebAssembly. It boots an actual DOS disk image, not a pretend terminal. A retro CRT desktop surrounds the live emulated computer.

## Rung 1

- Boot the openly distributable 720 KB FreeDOS demo floppy, fetched from the official v86 image host.
- Choose MS-DOS 3.30, 5.0, 6.22 or other PC media, then supply your own authorized bootable floppy/hard-disk/CD image. Selecting a version is a label for the user's imported media, not an included Microsoft OS.
- Change memory size, power on/off, pause/resume, restart, send Ctrl+Alt+Del, insert/eject floppies and CDs, load local media.
- Save and restore emulator state (requires the same original disk image and emulator build); fullscreen screen and keyboard guidance.
- GitHub Actions builds the React site, checks types and publishes to GitHub Pages when main changes.

## Rung 2: DOS game cabinet

A separate real DOSBox-based game cabinet is now available through the browser, powered by the official [js-dos v8 player](https://js-dos.com/). It can launch the **official upstream Digger example** directly from the js-dos CDN, or a locally chosen `.jsdos` bundle (up to 256 MiB) supplied by the user. The emulator/player assets are fetched on demand from js-dos servers; no bundle is uploaded to our application. Local file-system persistence is supported by js-dos's browser storage. The game cabinet does not ship commercial games.

This Rung 2 integration is hosted via js-dos's maintained `latest` CDN rather than packaging GPL code into RetroVerse. That entails an internet dependency and possible upstream API drift, so production testing and a later pinned/self-hosted build are planned. js-dos retains its GPL-2.0 license; our application license does not supersede it.

## Play online

After the Pages workflow is enabled under **Settings → Pages → Build and deployment → GitHub Actions**, the default deployment target is:

**https://michaelwave369.github.io/RetroVerse/**

GitHub Pages is free static hosting; the browser executes the emulator. The first boot loads the FreeDOS demo floppy from the v86-hosted image server. Your own uploaded images stay in browser memory, not on a RetroVerse server.

## Local development

Requires Node.js 22+ and internet for first-time dependencies and legal open-firmware downloads.

    npm install
    npm run dev

For a production build:

    npm run build
    npm run preview

The \`predev\` and \`prebuild\` scripts copy the official v86 WASM files and download pinned SeaBIOS / VGA BIOS binaries to \`public/vendor\`. Those generated files are gitignored; no binary firmware is checked into this repository.

## Architecture

- \`src/boot.ts\`: typed guest boot profiles and hardware configuration.
- \`src/App.tsx\`: browser emulator lifecycle, media controls, and React interface.
- \`src/styles.css\`: retro desktop and CRT-inspired UI.
- \`scripts/prepare-assets.mjs\`: reproducible open firmware + WASM preparation.
- \`.github/workflows/pages.yml\`: build + deploy pipeline.

## Roadmap

1. **DOS PC:** authentic boot, power controls, imported disk images, save states.
2. **Game cabinet:** js-dos launcher with official upstream demo, .jsdos imports and local saves. Future: controller presets, self-hosted runtime.
3. **Amiga:** browser Amiga emulator, user-provided Kickstart/ADF media and AROS where compatible.
4. **Adventures:** ScummVM for user-provided compatible adventure-game data.
5. **Museum / XR:** browsable computer rooms connected with PhiCade and PhiOS XR.

## Licensing and safety

Application code: MIT. Emulation dependencies, BIOS firmware and operating-system images have their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No proprietary BIOS or commercial games are bundled. Do not upload disks containing material you cannot legally use.

**No guest networking is enabled by default.** Local files are loaded into memory and not sent to a RetroVerse backend.

Developed as part of the Φ369 Labs open computing ecosystem.
