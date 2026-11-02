import test from "node:test";
import assert from "node:assert/strict";
import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";
import { readTandyFloppy, readTandyZip, tandyDosboxConf } from "../src/tandyMachine";

function floppy(): File {
  const bytes = new Uint8Array(737280);
  const v = new DataView(bytes.buffer);
  v.setUint16(11, 512, true); // 512-byte sectors
  bytes[13] = 2;              // 2 sectors per FAT12 cluster
  v.setUint16(14, 1, true);    // reserved sectors
  bytes[16] = 2;              // two FATs
  v.setUint16(17, 112, true);  // root directory entries
  v.setUint16(19, 1440, true); // 720 KiB capacity
  bytes[21] = 0xf9;
  v.setUint16(22, 3, true);    // sectors per FAT
  v.setUint16(24, 9, true);    // sectors per track
  v.setUint16(26, 2, true);    // floppy heads
  bytes[510] = 0x55;
  bytes[511] = 0xaa;
  // FAT #1 marks cluster 2 end-of-chain.
  bytes.set([0xf9,0xff,0xff,0xff,0x0f],512);
  bytes.set([0xf9,0xff,0xff,0xff,0x0f],2048);
  // Root starts at sector 7, data sector 14.
  const root = 7 * 512;
  bytes.set(new TextEncoder().encode("HELLO   COM"),root);
  v.setUint16(root + 26,2,true);
  v.setUint32(root + 28,3,true);
  bytes.set([0x90,0x90,0xc3],14 * 512);
  return new File([bytes],"DOS33_1000SL2.img");
}

test("Tandy SL/2 DOSBox profile selects three-voice audio and Tandy video",()=>{
  const conf=tandyDosboxConf("sl2","original",null);
  assert.match(conf,/machine=tandy/);
  assert.match(conf,/tandy=on/);
  assert.match(conf,/sbtype=none/);
  assert.match(conf,/cycles=fixed 2800/);
  assert.match(conf,/mount c \./);
  assert.doesNotMatch(conf,/DeskMate ROM installed/i);
});

test("Tandy SL profile can choose approximate slower DOS cycles and a safe program",()=>{
  const conf=tandyDosboxConf("sl","slow","GAMES/DEMO.EXE");
  assert.match(conf,/cycles=fixed 1400/);
  assert.match(conf,/cd \\GAMES/);
  assert.match(conf,/DEMO.EXE/);
  assert.throws(()=>tandyDosboxConf("sl","slow","..\\BAD.BAT"),/unsafe|DOS/i);
});

test("extracts a standard 720 KiB FAT12 DOS floppy without uploading or booting it",async()=>{
  const files=await readTandyFloppy(floppy());
  assert.equal(files.files.length,1);
  assert.equal(files.files[0].path,"HELLO.COM");
  assert.deepEqual([...files.files[0].contents],[144,144,195]);
  assert.deepEqual(files.programs,["HELLO.COM"]);
});

test("rejects damaged FAT12 image metadata",async()=>{
  const original=floppy();
  const data=new Uint8Array(await original.arrayBuffer());
  data[510]=0;
  await assert.rejects(()=>readTandyFloppy(new File([data],"floppy.img"))/unsupported FAT12/i);
});

test("can unpack a user-owned DOS ZIP and discover its executable",async()=>{
  const writer=new ZipWriter(new BlobWriter("application/zip"),{useWebWorkers:false});
  await writer.add("GAME.EXE",new BlobReader(new Blob([new Uint8Array([1,2,3,4])])));
  await writer.add("README.TXT",new BlobReader(new Blob(["hello"])));
  const archive=await writer.close();
  const result=await readTandyZip(new File([archive],"MYGAME.zip"));
  assert.equal(result.files.length,2);
  assert.deepEqual(result.programs,["GAME.EXE"]);
});

test("rejects unsafe zip filenames before any DOS program can launch",async()=>{
  const writer=new ZipWriter(new BlobWriter("application/zip"),{useWebWorkers:false});
  await writer.add("GAMES/BAD&EXIT.BAT",new BlobReader(new Blob(["echo nope"])));
  const archive=await writer.close();
  await assert.rejects(()=>readTandyZip(new File([archive],"test.zip")),/unsafe|filename|DOS-8.3/i);
});
