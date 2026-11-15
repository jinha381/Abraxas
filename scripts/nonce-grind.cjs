"use strict";
const { createHash } = require("node:crypto");
const { performance } = require("node:perf_hooks");
const { PublicKey } = require("@solana/web3.js");
function genome(value) {
  const data = typeof value === "string" ? value.replace(/[\[\]]/g, "").split(",").map(Number) : value;
  if (!Array.isArray(data) || data.length !== 7 || !data.every(x => Number.isInteger(x) && x >= 0 && x <= 3)) throw new Error("genome은 0~3의 정수 7개여야 합니다");
  return data;
}
function breedSeed(assetA, assetB, nonce) {
  nonce = BigInt(nonce);
  if (nonce < 0n || nonce > 0xffffffffffffffffn) throw new Error("nonce는 u64 범위여야 합니다");
  const le = Buffer.alloc(8); le.writeBigUInt64LE(nonce);
  return createHash("sha256").update(Buffer.concat([Buffer.from("HM-BREED-v1"), new PublicKey(assetA).toBuffer(), new PublicKey(assetB).toBuffer(), le])).digest();
}
function inherit(a, b, seed) { return a.map((x, i) => (seed[i] & 1) === 0 ? x : b[i]); }
function findNonce({ assetA, assetB, genomeA, genomeB, target, maxAttempts = 1000000, startNonce = 0n }) {
  const a = genome(genomeA), b = genome(genomeB), goal = genome(target);
  if (!goal.every((x, i) => x === a[i] || x === b[i])) throw new Error("목표 genome은 각 위치에서 부모 중 하나의 값이어야 합니다");
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new Error("maxAttempts는 양의 안전 정수여야 합니다");
  const begin = performance.now(); let nonce = BigInt(startNonce);
  for (let attempt = 1; attempt <= maxAttempts && nonce <= 0xffffffffffffffffn; attempt++, nonce++) {
    const seed = breedSeed(assetA, assetB, nonce), child = inherit(a, b, seed);
    if (child.every((x, i) => x === goal[i])) return { nonce: nonce.toString(), attempts: attempt, duration_ms: performance.now() - begin, seed: seed.toString("hex"), genome: child };
  }
  throw new Error("제한된 시도 안에서 목표 nonce를 찾지 못했습니다");
}
module.exports = { findNonce, breedSeed, inherit };
if (require.main === module) {
  const [assetA, assetB, genomeA, genomeB, target, limit, start] = process.argv.slice(2);
  if (!target) { console.error("사용법: node scripts/nonce-grind.cjs A공개키 B공개키 A유전체(csv7개) B유전체 목표유전체 [최대시도] [시작nonce]"); process.exitCode = 1; }
  else try { console.log(JSON.stringify(findNonce({ assetA, assetB, genomeA, genomeB, target, maxAttempts: limit ? Number(limit) : 1000000, startNonce: start || 0 }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
