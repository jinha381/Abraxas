import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { createHash, randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { Keypair, PublicKey, SystemProgram, Transaction, ComputeBudgetProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { fetchAssetV1, mplCore } from "@metaplex-foundation/mpl-core";
import type { Hatchmind } from "../target/types/hatchmind";

async function main() {
  assert.equal(process.env.HATCHMIND_DEVNET_APPROVED, "yes", "사용자 실행 승인 필요");
  const provider = anchor.AnchorProvider.env();
  assert.equal(provider.connection.rpcEndpoint, "https://api.devnet.solana.com", "devnet 전용 별도 스크립트");
  const program = new anchor.Program<Hatchmind>(JSON.parse(readFileSync("target/idl/hatchmind.json", "utf8")), provider);
  const founders = Array.from({ length: 4 }, () => Keypair.generate()), recipient = Keypair.generate(), assets = [Keypair.generate(), Keypair.generate()];
  const pda = (seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const config = pda([Buffer.from("config")]), coreProgram = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
  const pet = (asset: PublicKey) => pda([Buffer.from("pet"), asset.toBuffer()]);
  const budget = () => ComputeBudgetProgram.setComputeUnitLimit({ units: 600000 });
  const steps: { name: string; signature: string }[] = [];
  const deployment = JSON.parse(readFileSync(".local/devnet/deploy.json", "utf8"));
  if (typeof deployment.signature === "string") steps.push({ name: "배포", signature: deployment.signature });
  else {
    const signatures = await provider.connection.getSignaturesForAddress(program.programId, { limit: 1 }, "confirmed");
    assert.lengthOf(signatures, 1, "배포 트랜잭션 서명 확인 필요");
    steps.push({ name: "배포(신규 프로그램의 마지막 트랜잭션)", signature: signatures[0].signature });
  }
  function report(status: string) {
    const lines = ["# Devnet 스모크 테스트", "", `- 실행 시각(UTC): ${new Date().toISOString()}`, `- 상태: ${status}`, "- 사용자 승인 후 실행한 3초 local-testing 빌드. 운영 배포 설정은 아닙니다.", "- Core 바이너리는 실행 전에 고정 0.15.3 해시와 대조합니다.", "- 에어드롭은 하지 않습니다. 미리 준비한 배포 지갑 잔액을 사용합니다.", "- 일회용 테스트 지갑은 메모리에서만 생성하며, 비밀키를 기록하지 않습니다.", "", "| 단계 | 트랜잭션 |", "|---|---|"];
    lines.push(...steps.map(s => `| ${s.name} | [${s.signature}](https://explorer.solana.com/tx/${s.signature}?cluster=devnet) |`));
    writeFileSync("docs/DEVNET.md", lines.join("\n") + "\n");
  }
  async function record(name: string, action: Promise<string>) { const signature = await action; steps.push({ name, signature }); report("진행 중"); }
  async function clock() { return Number((await provider.connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "confirmed"))!.data.readBigInt64LE(32)); }
  async function until(target: number) {
    const timeout = Date.now() + 120000;
    while ((await clock()) < target) { assert.isBelow(Date.now(), timeout); await new Promise(r => setTimeout(r, 400)); }
  }
  try {
    assert.isNull(await provider.connection.getAccountInfo(config), "기존 config를 사용하는 재실행은 금지");
    const tx = new Transaction();
    for (const k of [...founders, recipient]) tx.add(SystemProgram.transfer({ fromPubkey: provider.wallet.publicKey, toPubkey: k.publicKey, lamports: 0.1e9 }));
    await record("일회용 지갑 자금 준비", provider.sendAndConfirm(tx));
    await record("initialize", program.methods.initialize(founders.map(f => f.publicKey)).accountsStrict({ config, authority: provider.wallet.publicKey, systemProgram: SystemProgram.programId }).rpc());
    assert.equal((await program.account.config.fetch(config)).stageSeconds.toNumber(), 3);
    for (let i = 0; i < 2; i++) await record(`register_pet(${i})`, program.methods.registerPet(i).accountsStrict({ config, pet: pet(assets[i].publicKey), asset: assets[i].publicKey, owner: founders[i].publicKey, coreProgram, systemProgram: SystemProgram.programId }).preInstructions([budget()]).signers([founders[i], assets[i]]).rpc());
    for (const stage of [1, 2]) {
      const parents = await Promise.all(assets.map(a => program.account.petRecord.fetch(pet(a.publicKey))));
      await until(Math.max(...parents.map(p => p.changedAt.toNumber() + 3)));
      for (let i = 0; i < 2; i++) await record(`record_evolution(${i},${stage})`, program.methods.recordEvolution(stage).accountsStrict({ config, pet: pet(assets[i].publicKey), asset: assets[i].publicKey, owner: founders[i].publicKey }).signers([founders[i]]).rpc());
    }
    const nonce = new anchor.BN(1), request = pda([Buffer.from("breed"), assets[0].publicKey.toBuffer(), assets[1].publicKey.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)]);
    await record("request_breeding", program.methods.requestBreeding(nonce, new anchor.BN(600)).accountsStrict({ config, petA: pet(assets[0].publicKey), petB: pet(assets[1].publicKey), assetA: assets[0].publicKey, assetB: assets[1].publicKey, request, requester: founders[0].publicKey, systemProgram: SystemProgram.programId }).signers([founders[0]]).rpc());
    await record("approve_breeding", program.methods.approveBreeding().accountsStrict({ request, assetA: assets[0].publicKey, assetB: assets[1].publicKey, owner: founders[1].publicKey }).signers([founders[1]]).rpc());
    const child = Keypair.generate();
    await record("execute_breeding", program.methods.executeBreeding().accountsStrict({ config, request, petA: pet(assets[0].publicKey), petB: pet(assets[1].publicKey), assetA: assets[0].publicKey, assetB: assets[1].publicKey, child: pet(child.publicKey), childAsset: child.publicKey, childOwner: founders[0].publicKey, payer: founders[0].publicKey, coreProgram, systemProgram: SystemProgram.programId }).preInstructions([budget()]).signers([founders[0], child]).rpc());
    const secret = randomBytes(32), hash = createHash("sha256").update(secret).digest(), gift = pda([Buffer.from("gift"), child.publicKey.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)]);
    await record("create_gift_claim", program.methods.createGiftClaim(nonce, [...hash], new anchor.BN(600)).accountsStrict({ pet: pet(child.publicKey), asset: child.publicKey, gift, giver: founders[0].publicKey, coreProgram, systemProgram: SystemProgram.programId }).preInstructions([budget()]).signers([founders[0]]).rpc());
    await record("claim_egg", program.methods.claimEgg([...secret]).accountsStrict({ gift, asset: child.publicKey, recipient: recipient.publicKey, coreProgram, systemProgram: SystemProgram.programId }).preInstructions([budget()]).signers([recipient]).rpc());
    const umi = createUmi(provider.connection.rpcEndpoint).use(mplCore());
    assert.equal((await fetchAssetV1(umi, publicKey(child.publicKey.toBase58()))).owner.toString(), recipient.publicKey.toBase58());
    assert.isTrue((await program.account.giftClaim.fetch(gift)).claimed);
    report("PASS");
  } catch (error) { report("FAIL: " + String(error).replace(/\n/g, " ")); throw error; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
