"use strict";
// 실제 등록으로 만들 수 없는 비Core/PetRecord 조합을 독립 로컬 genesis에만 주입합니다.
const fs = require("node:fs"), path = require("node:path"), anchor = require("@coral-xyz/anchor");
const { Keypair, PublicKey, Connection, SystemProgram } = require("@solana/web3.js");
async function main() {
  const dir = path.resolve(".local/production-fixtures"); fs.mkdirSync(dir, { recursive: true });
  const provider = new anchor.AnchorProvider(new Connection("http://127.0.0.1:18999"), new anchor.Wallet(Keypair.generate()), {});
  const program = new anchor.Program(require("../target/idl/hatchmind.json"), provider);
  const args = [], fixtures = [];
  function account(address, owner, data) {
    const file = path.join(dir, address.toBase58() + ".json");
    fs.writeFileSync(file, JSON.stringify({ pubkey: address.toBase58(), account: { lamports: 10000000, data: [data.toString("base64"), "base64"], owner: owner.toBase58(), executable: false, rentEpoch: 0 } }, null, 2));
    args.push(address.toBase58() + "\t" + file);
  }
  for (const [kind, owner] of [["system", SystemProgram.programId], ["other-program", program.programId]]) {
    const asset = Keypair.generate().publicKey;
    const pet = PublicKey.findProgramAddressSync([Buffer.from("pet"), asset.toBuffer()], program.programId)[0];
    const record = await program.coder.accounts.encode("petRecord", { asset, parentA: PublicKey.default, parentB: PublicKey.default, seed: Array(32).fill(0), genome: Array(7).fill(0), stage: 2, changedAt: new anchor.BN(0), lastBred: new anchor.BN(0) });
    account(asset, owner, kind === "system" ? Buffer.alloc(0) : Buffer.from([0]));
    account(pet, program.programId, record);
    fixtures.push({ kind, asset: asset.toBase58(), pet: pet.toBase58(), owner: owner.toBase58() });
  }
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(fixtures, null, 2));
  fs.writeFileSync(path.join(dir, "accounts.tsv"), args.join("\n") + "\n");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
