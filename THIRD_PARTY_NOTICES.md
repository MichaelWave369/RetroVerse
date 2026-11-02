# Third-party components and media

RetroVerse's application code is MIT-licensed. The following components retain their independent licenses:

- [v86](https://github.com/copy/v86), BSD-2-Clause. Installed via the official npm package and built into the application.
- [SeaBIOS](https://www.seabios.org/) BIOS firmware and VGA BIOS from the v86 upstream repository, LGPL. Downloaded at build time from pinned upstream commit 315b2b0b758703ef0e6cc7b4088d6068f83f3c20. See [v86 bios/COPYING.LESSER](https://github.com/copy/v86/blob/master/bios/COPYING.LESSER) and the upstream source to obtain firmware source and license terms.
- [FreeDOS](https://freedos.org/), free/open DOS-compatible operating system. The sample image is loaded from the v86 demo's external image host on demand, not stored in this repository. The programs within the image retain their original licenses.

No Microsoft DOS or commercial game images are included. You must own or be authorized to use any ROM, firmware, disk, or game files that you provide. Booting in a browser does not make copyrighted software public-domain.
