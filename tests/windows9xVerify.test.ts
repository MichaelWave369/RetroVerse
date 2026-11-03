import test from "node:test";
import assert from "node:assert/strict";
import { verifyWindowsDiskDownload } from "../src/windows9xVerify";

function image(bytes: number[], filename = "guest.img"): File {
  return new File([Uint8Array.from(bytes)], filename, { type: "application/octet-stream" });
}
const bytes = [1,2,3,4,5,6,7,8,9,10,11,12,13];

test("download comparison checks every byte across chunk boundaries", async () => {
  const seen: Array<[number,number]> = [];
  const result = await verifyWindowsDiskDownload(
    image(bytes,"exported.img"), image(bytes,"renamed.img"),
    (done,total) => seen.push([done,total]),undefined,4
  );
  assert.deepEqual(result,{bytesChecked:13,chunksChecked:4});
  assert.deepEqual(seen,[[0,13],[4,13],[8,13],[12,13],[13,13]]);
});

test("same-size corrupted downloaded disk is rejected at the precise offset", async () => {
  const broken=[...bytes]; broken[8]=99;
  await assert.rejects(
    () => verifyWindowsDiskDownload(image(bytes),image(broken),undefined,undefined,4),
    /differs from export at byte 8/i
  );
});

test("truncated or enlarged browser downloads fail before comparing chunks", async () => {
  await assert.rejects(
    () => verifyWindowsDiskDownload(image(bytes),image(bytes.slice(0,8))),
    /size mismatch/i
  );
  await assert.rejects(
    () => verifyWindowsDiskDownload(image(bytes),image([...bytes,14])),
    /size mismatch/i
  );
});

test("empty images and invalid chunk sizes are rejected", async () => {
  await assert.rejects(
    () => verifyWindowsDiskDownload(image([]),image([])),
    /updated .img/i
  );
  await assert.rejects(
    () => verifyWindowsDiskDownload(image(bytes),image(bytes),undefined,undefined,0),
    /chunk size/i
  );
  await assert.rejects(
    () => verifyWindowsDiskDownload(image(bytes),image(bytes),undefined,undefined,17*1024*1024),
    /chunk size/i
  );
});

test("an aborted download verification never reports success", async () => {
  const aborter=new AbortController();
  await assert.rejects(
    () => verifyWindowsDiskDownload(
      image(bytes), image(bytes),
      (count) => {if(count>=4)aborter.abort();}, aborter.signal,4
    ),
    /verification canceled/i
  );
});

test("a failed comparison does not report full progress", async () => {
  const seen: number[] = [];
  const mutated=[...bytes];mutated[12]=0;
  await assert.rejects(() => verifyWindowsDiskDownload(
    image(bytes),image(mutated),(count)=>seen.push(count),undefined,4
  ),/differs from export/);
  assert.ok(!seen.includes(13));
});
