import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { Keypair, PublicKey, SystemProgram, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { readFileSync, writeFileSync } from "fs";
import type { Hatchmind } from "../target/types/hatchmind";
import { initializationChecks } from "./initialization-checks";
describe("독립 운영 빌드 로컬 검증", function () {
  this.timeout(120000);
  const environment = anchor.AnchorProvider.env();
  const provider = new anchor.AnchorProvider(environment.connection, environment.wallet, { commitment: "confirmed", preflightCommitment: "confirmed" });
  assert.equal(provider.connection.rpcEndpoint, "http://127.0.0.1:18999", "운영 검증 전용 로컬 포트만 사용");
  const program = new anchor.Program<Hatchmind>(JSON.parse(readFileSync("target/idl/hatchmind.json", "utf8")), provider);
  const founders = Array.from({ length: 4 }, () => Keypair.generate()), attacker = Keypair.generate();
  const pda = (seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const config = pda([Buffer.from("config")]);
  const pet = (asset: PublicKey) => pda([Buffer.from("pet"), asset.toBuffer()]);
  const core = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
  const asset = Keypair.generate(), observations: unknown[] = [];
  const note = (id: string, result: unknown) => {
    observations.push({ id, result });
    writeFileSync(".local/production-observations.json", JSON.stringify(observations, null, 2));
  };
  initializationChecks(provider, program, founders, attacker, note);
  before(async () => {
    const tx = new Transaction();
    for (const owner of founders) tx.add(SystemProgram.transfer({ fromPubkey: provider.wallet.publicKey, toPubkey: owner.publicKey, lamports: 5e9 }));
    await provider.sendAndConfirm(tx);
  });
  async function fails(action: Promise<unknown>, expected: string) {
    let error: any; try { await action; } catch (e) { error = e; }
    assert.equal(error?.error?.errorCode?.code, expected, String(error));
  }
  it("O01: local-testing 없는 산출물은 2592000초, 등록 직후 성장은 TooEarly", async () => {
    assert.equal((await program.account.config.fetch(config)).stageSeconds.toNumber(), 2592000);
    await program.methods.registerPet(0).accountsStrict({ config, pet: pet(asset.publicKey), asset: asset.publicKey, owner: founders[0].publicKey, coreProgram: core, systemProgram: SystemProgram.programId }).preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 600000 })]).signers([asset, founders[0]]).rpc();
    const before = await provider.connection.getAccountInfo(pet(asset.publicKey));
    await fails(program.methods.recordEvolution(1).accountsStrict({ config, pet: pet(asset.publicKey), asset: asset.publicKey, owner: founders[0].publicKey }).signers([founders[0]]).rpc(), "TooEarly");
    assert.deepEqual((await provider.connection.getAccountInfo(pet(asset.publicKey)))!.data, before!.data);
    note("O01", { verdict: "PASS", stage_seconds: 2592000, immediate_growth: "TooEarly", state_unchanged: true });
  });
  it("S14: genesis fixture의 System/다른 프로그램 소유 asset은 handler에서 InvalidCoreAsset", async () => {
    const fixtures = JSON.parse(readFileSync(".local/production-fixtures/manifest.json", "utf8")); let nonce = 0;
    for (const fixture of fixtures) {
      const fake = new PublicKey(fixture.asset), fakePet = new PublicKey(fixture.pet);
      assert.equal((await provider.connection.getAccountInfo(fake))!.owner.toBase58(), fixture.owner);
      const keys = [fake, fakePet, asset.publicKey, pet(asset.publicKey)];
      const previous = (await provider.connection.getMultipleAccountsInfo(keys)).map(a => a!.data.toString("base64"));
      await fails(program.methods.recordEvolution(3).accountsStrict({ config, pet: fakePet, asset: fake, owner: founders[0].publicKey }).signers([founders[0]]).rpc(), "InvalidCoreAsset");
      for (const side of ["a", "b"]) {
        const aa = side === "a" ? fake : asset.publicKey, bb = side === "b" ? fake : asset.publicKey, n = new anchor.BN(++nonce);
        const request = pda([Buffer.from("breed"), aa.toBuffer(), bb.toBuffer(), n.toArrayLike(Buffer, "le", 8)]);
        await fails(program.methods.requestBreeding(n, new anchor.BN(120)).accountsStrict({ config, petA: pet(aa), petB: pet(bb), assetA: aa, assetB: bb, request, requester: founders[0].publicKey, systemProgram: SystemProgram.programId }).signers([founders[0]]).rpc(), "InvalidCoreAsset");
        assert.isNull(await provider.connection.getAccountInfo(request));
      }
      assert.deepEqual((await provider.connection.getMultipleAccountsInfo(keys)).map(a => a!.data.toString("base64")), previous);
    }
    note("S14", { verdict: "PASS", fixture_only: true, owner_classes: ["system", "hatchmind"], entrypoints: ["record_evolution", "request_breeding.asset_a", "request_breeding.asset_b"], error: "InvalidCoreAsset" });
  });
});
