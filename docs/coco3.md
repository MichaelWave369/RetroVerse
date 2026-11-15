# RetroVerse CoCo 3 exhibit

The Radio Shack / Tandy **TRS-80 Color Computer 3** (1986) now has its own museum station, separate from the later x86 **Tandy 1000 SL/2**. This was prompted by remembering a first computer and the space shooter **Silpheed** (released for the CoCo 3 in 1988).

## Available in the browser
- Interactive CRT-styled BASIC workbench, physical keyboard and on-screen keys.
- Limited educational interpreter with numbered lines, PRINT, LET, expressions, IF ... THEN line, GOTO, REM, CLS, LIST, RUN, NEW, END, STOP, HELP.
- A sample looping program; plain-text local .bas import and export.
- Local cartridge filename and size inspection for user-provided .rom/.ccc/.bin files (maximum 2 MiB).
- Silpheed history plaque, without including games or copyrighted firmware.

## Historical and technical accuracy
**The workbench is not a real CoCo 3 emulator.** It does not emulate the 6809 CPU, GIME, original BASIC ROM, floppy subsystem, audio, cartridge execution, or CoCo graphical modes. It is an introductory BASIC subset, not full Extended Color BASIC. No commercial ROM/game media is included or uploaded.

For original hardware emulation on the desktop, RetroVerse links the independently maintained XRoar project: https://www.6809.org.uk/xroar/. Visitors must obtain legally authorized machine firmware and software themselves.

## Manual smoke test
1. Enter the CoCo 3 station in compact tabs and from the Time Hall. Check that the museum counts ten stations.
2. Power on, type PRINT "HELLO" in the BASIC command line. Check the on-screen keys.
3. Load the sample program and run LIST and RUN. Verify the three MEMORY LOOP outputs.
4. Save .BAS, issue NEW, reopen the source, and rerun.
5. Inspect an authorized cartridge file. Confirm file size is displayed, but no execution/upload occurs.
6. Test desktop/mobile navigation and the Quest Time Hall plaque/door. Native Quest Browser behavior requires an actual headset test.


## Real CoCo 3 emulation: XRoar Online

The CoCo 3 station has a **separate official XRoar Online launcher** (https://www.6809.org.uk/xroar/online/) and an *opt-in experimental iframe*. The external site runs a real Emscripten/WebAssembly XRoar hardware emulator. By contrast, the original CRT-styled BASIC workbench is still RetroVerse's educational simulation.

**Start the genuine emulator:**
1. Click **OPEN XROAR ONLINE** in the CoCo 3 station (recommended). It opens the independent XRoar provider in another tab. The optional in-page iframe may be blocked by the provider/browser; the full-page link is always available.
2. In XRoar, choose **Hardware → Machine → CoCo 3**. The official built-in XRoar machine profile is named coco3. The browser's XRoar interface can vary.
3. Provide your own authorized, headerless CoCo 3 firmware. XRoar's manual documents coco3.rom (32,768 bytes, NTSC) or coco3p.rom (32,768 bytes, PAL), plus additional firmware for certain peripherals such as disk controllers.
4. Load the software image using XRoar's own media controls. The official browser application supports cassette, floppy, cartridge and other supported media as described in the [manual](https://www.6809.org.uk/xroar/doc/xroar.shtml).
5. No firmware or Silpheed game data is distributed with RetroVerse. The site does **not** pass ROM files across origins or upload them to RetroVerse; your file picker inside XRoar is owned by the upstream provider.

**Real XRoar is external for this rung.** We have not built or self-hosted its WebAssembly binary within RetroVerse yet. We also cannot guarantee that an iframe loads, because the provider may restrict framing. Desktop full-page XRoar is the dependable option.

## Building the official XRoar repository

Upstream developer repository: https://www.6809.org.uk/git/xroar.git

Official versioned source code uses the **GNU GPL version 3 or later**. This code belongs to XRoar's contributors, not RetroVerse. The XRoar author documents the browser build at https://www.6809.org.uk/xroar/online/about.shtml.

To attempt a local build on Linux or WSL, first install Autotools and activate an Emscripten SDK with emconfigure and emmake in PATH. Then, from your RetroVerse checkout:

~~~sh
bash scripts/build-xroar-wasm.sh
~~~

The script performs the documented high-level procedure:

~~~sh
git clone https://www.6809.org.uk/git/xroar.git
cd xroar
./autogen.sh
emconfigure ./configure --enable-wasm CFLAGS="-O3 -flto" LDFLAGS="-O3 -flto"
emmake make
~~~

The helper leaves the upstream checkout under .build/xroar, records the HEAD revision in the console, and reports candidate build artifacts. It intentionally **does not** deploy anything, guess at which generated files to serve, download ROMs, or modify the RetroVerse production build. WebAssembly, the matching HTML/JS runtime, and the upstream WASM user interface must be packaged together, following the source tree's wasm/ documentation. If publishing compiled XRoar, include the required GPL notices, copyright attribution and corresponding source. Test machine selection, firmware loading, media, keyboard/joystick, sound, frame performance and mobile/Quest Browser before promoting a self-hosted build.

**Status:** The source build recipe is present but has **not** been executed in the RetroVerse CI job; the build's success, license packaging and runtime operation require future verification.
