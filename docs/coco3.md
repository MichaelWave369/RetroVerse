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
