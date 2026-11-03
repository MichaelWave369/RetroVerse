import test from "node:test";
import assert from "node:assert/strict";
import { exportUpdatedWindows9xDisk, updatedDiskFilename } from "../src/windows9xDiskExport";

const base = new File([new Uint8Array([1,2,3,4,5,6,7,8])], "owned-win95.raw");

function machine(
  source: File,
  result: File,
  modifiedBlocks: Set<number> = new Set([0]),
) {
  return {
    v86: {
      cpu: {
        devices: {
          ide: {
            primary: {
              master: {
                buffer: {
                  file: source,
                  byteLength: source.size,
                  block_cache_is_write: modifiedBlocks,
                  get_as_file: (name: string) => new File([result], name),
                },
              },
            },
          },
        },
      },
    },
  };
}

test("generates a stable portable IMG name from user file", () => {
  assert.equal(updatedDiskFilename("disk.img"),"disk-retroverse-updated.img");
  assert.equal(updatedDiskFilename("owned-win95.raw"),"owned-win95-retroverse-updated.img");
  assert.equal(updatedDiskFilename("windows95.bin"),"windows95-retroverse-updated.img");
});

test("exports modified disk bytes from the documented guarded internal adapter", async () => {
  const modified = new File([new Uint8Array([1,2,3,44,55,6,7,8])], "new.img");
  const result = exportUpdatedWindows9xDisk(machine(base, modified),base,true);
  assert.equal(result.modifiedBlocks,1);
  assert.equal(result.file.name,"owned-win95-retroverse-updated.img");
  assert.equal(result.file.size,base.size);
  assert.deepEqual([...new Uint8Array(await result.file.arrayBuffer())],[1,2,3,44,55,6,7,8]);
  assert.deepEqual([...new Uint8Array(await base.arrayBuffer())],[1,2,3,4,5,6,7,8]);
});

test("refuses to export while the guest machine is still running", () => {
  assert.throws(()=>exportUpdatedWindows9xDisk(machine(base,base),base,false),/Pause Windows/i);
});

test("rejects unsupported v86 internal objects without creating an invalid backup", () => {
  assert.throws(()=>exportUpdatedWindows9xDisk({},base,true),/not expose a compatible/i);
  assert.throws(()=>exportUpdatedWindows9xDisk({v86:{cpu:{devices:{}}}},base,true),/not expose/i);
  const mismatched=new File([new Uint8Array(8)],"different.img");
  assert.throws(()=>exportUpdatedWindows9xDisk(machine(mismatched,base),base,true),/not expose/i);
});

test("refuses invalid or inconsistent full disk output", () => {
  const truncated=new File([new Uint8Array(3)],"small.img");
  assert.throws(()=>exportUpdatedWindows9xDisk(machine(base,truncated),base,true),/failed validation/i);
  assert.throws(()=>exportUpdatedWindows9xDisk(machine(base,base,new Set<number>([999999])),base,true),/invalid block count/i);
  const withoutTracker=machine(base,base);
  // A future v86 version might rename the dirty-sector tracking structure.
  const disk=withoutTracker.v86.cpu.devices.ide.primary.master.buffer;
  (disk as {block_cache_is_write?: Set<number>}).block_cache_is_write=undefined;
  assert.throws(()=>exportUpdatedWindows9xDisk(withoutTracker,base,true),/cannot verify modified sectors/i);
});
