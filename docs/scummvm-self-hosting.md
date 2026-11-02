# ScummVM self-hosting: engineering gate

## Current reality

RetroVerse Rung 4 launches an external ScummVM WebAssembly demo operated by another project. RetroVerse currently does **not** host its own ScummVM interpreter. Rung 5 adds browser-local DOS game storage, not a new adventure-game runtime.

## Acceptance gates for an independently hosted engine

1. **Pinned source and toolchain.** Select and record exact ScummVM Git revision, Emscripten toolchain version, dynamic plugin choices, and output hashes. The upstream ScummVM Emscripten README documents the build helper under dists/emscripten/build.sh.
2. **Minimal interpreter first.** Build only the SCUMM engine with no commercial games or data. Avoid shipping every plugin and large asset during a first validation. Build into an isolated workflow or release artifact, not every Vite/Pages build.
3. **Licensing.** ScummVM is GPL; comply with corresponding-source distribution and attribution, maintain clear version/provenance notices, and review the resulting distribution's license obligations. Branding code having an MIT license does not turn the interpreter MIT.
4. **Owned game imports.** Allow visitors to use their own authorized game data locally. Do not silently upload or expose private game files. Consider IndexedDB, explicit export and offline-only options after testing.
5. **Hosting.** Verify WebAssembly/JS and plugin sizes, deployment caps, MIME types, CORS, caching and memory usage on GitHub Pages. Never assume a link to another site is self-hosting.
6. **Real acceptance tests.** Browser-boot a supported freeware or individually cleared demo in the first-party environment; test mouse, audio, saves, reloads and gamepad. A successful TypeScript or Webpack build proves none of these.
7. **Sovereignty criterion.** Once all essential ScummVM interpreter assets are served from a RetroVerse-controlled origin and verified gameplay no longer depends on scummvm.kuendig.io, the Adventure Wing may be relabeled self-hosted.

## Upstream

- ScummVM WebAssembly build: https://github.com/scummvm/scummvm/blob/master/dists/emscripten/README.md
- Unofficial web-demo source: https://github.com/chkuendig/scummvm-demo
- Official game rights/freeware download archive: https://www.scummvm.org/games/
- ScummVM source and license: https://github.com/scummvm/scummvm

This plan does not execute a ScummVM build in the standard Pages pipeline. It is an engineering prerequisite and rights review, not a gameplay claim.
