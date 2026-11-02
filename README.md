# RetroVerse

A real retro-computer time machine in your browser. **Rung 1: DOS PC.**

RetroVerse starts with an IBM PC-compatible computer powered by [v86](https://github.com/copy/v86) and WebAssembly. It boots an actual DOS disk image, not a pretend terminal. A retro CRT desktop surrounds the live emulated computer.

## Rung 1

- Boot the openly distributable FreeDOS demo disk image, fetched from the official v86 image host.
- Choose MS-DOS 3.30, 5.0, 6.22 or other PC media, then supply your own authorized bootable floppy/hard-disk/CD image. Selecting a version is a label for the user's imported media, not an included Microsoft OS.
- Change memory size, power on/off, pause/resume, restart, send Ctrl+Alt+Del, insert/eject floppies and CDs, load local media.
- Save and restore emulator state (requires the same original disk image and emulator build); fullscreen screen and keyboard guidance.
- GitHub Actions builds the React site, checks types and publishes to GitHub Pages when main changes.

## Play online

After the Pages workflow is enabled under **Settings → Pages → Build and deployment → GitHub Actions**, the default deployment target is:

**https://michaelwave369.github.io/RetroVerse/**

GitHub Pages is free static hosting; the browser executes the emulator. The first boot fetches the FreeDOS demo from the v86-hosted image server. Your own uploaded images stay in browser memory, not on a RetroVerse server.

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
2. **Game cabinet:** js-dos launcher with legally distributable game demos, controller support and saves.
3. **Amiga:** browser Amiga emulator, user-provided Kickstart/ADF media and AROS where compatible.
4. **Adventures:** ScummVM for user-provided compatible adventure-game data.
5. **Museum / XR:** browsable computer rooms connected with PhiCade and PhiOS XR.

## Licensing and safety

Application code: MIT. Emulation dependencies, BIOS firmware and operating-system images have their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No proprietary BIOS or commercial games are bundled. Do not upload disks containing material you cannot legally use.

**No guest networking is enabled by default.** Local files are loaded into memory and not sent to a RetroVerse backend.

Developed as part of the Φ369 Labs open computing ecosystem.
