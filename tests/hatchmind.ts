import * as anchor from "@coral-xyz/anchor";
import type { Hatchmind } from "../target/types/hatchmind";
import { assert } from "chai";
import { createHash, randomBytes } from "crypto";
import { Keypair, PublicKey, SystemProgram, Transaction, SYSVAR_CLOCK_PUBKEY, ComputeBudgetProgram } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { mplCore, transferV1, fetchAssetV1, fetchAsset, addPlugin, burnV1, getMplCoreErrorFromCode } from "@metaplex-foundation/mpl-core";
import { mkdirSync, writeFileSync } from "fs";
import { costs, recordCosts } from "../validation/cost-recorder";

describe("HatchMind local on-chain integration", function () {
  this.timeout(180000);
  const environment = anchor.AnchorProvider.env();
  const provider = new anchor.AnchorProvider(environment.connection, environment.wallet,
    { commitment: "confirmed", preflightCommitment: "confirmed" });
  assert.match(provider.connection.rpcEndpoint, /^http:\/\/(127\.0\.0\.1|localhost):/, "local validator only");
  anchor.setProvider(provider);
  const program = anchor.workspace.Hatchmind as anchor.Program<Hatchmind>;
  recordCosts(provider, program);
  const core = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
  const user1 = Keypair.generate(), user2 = Keypair.generate(), user3 = Keypair.generate(), user4 = Keypair.generate();
  const stranger = Keypair.generate();
  const wallets = [user1, user2, user3, user4];
  const pets = wallets.map(() => Keypair.generate());
  const config = pda([Buffer.from("config")]);
  let sequence = 0;
  let egg: Keypair, secondEgg: Keypair;
  const budget = () => ComputeBudgetProgram.setComputeUnitLimit({ units: 600000 });
  function pda(seeds: Buffer[]) { return PublicKey.findProgramAddressSync(seeds, program.programId)[0]; }
  function le(n: number) { return new anchor.BN(n).toArrayLike(Buffer, "le", 8); }
  function pet(asset: PublicKey) { return pda([Buffer.from("pet"), asset.toBuffer()]); }
  function breed(a: PublicKey, b: PublicKey, n: number) {
    return pda([Buffer.from("breed"), a.toBuffer(), b.toBuffer(), le(n)]);
  }
  function gift(asset: PublicKey, n: number) { return pda([Buffer.from("gift"), asset.toBuffer(), le(n)]); }
  async function clock() {
    const a = await provider.connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "confirmed");
    return Number(a!.data.readBigInt64LE(32));
  }
  async function until(target: number) {
    const deadline = Date.now() + 60000;
    while ((await clock()) < target) {
      assert.isBelow(Date.now(), deadline, "local validator clock stalled");
      await new Promise(r => setTimeout(r, 200));
    }
  }
  async function ready(a = pets[0], b = pets[1]) {
    const records = await Promise.all([program.account.petRecord.fetch(pet(a.publicKey)), program.account.petRecord.fetch(pet(b.publicKey))]);
    await until(Math.max(...records.map((r: any) => r.lastBred.toNumber() + 3)));
  }
  async function fails(action: Promise<unknown>, expected: string) {
    let err: any;
    try { await action; } catch (e) { err = e; }
    assert.exists(err, "transaction unexpectedly succeeded; expected " + expected);
    const actual = err?.error?.errorCode?.code;
    assert.equal(actual, expected, "must fail with precise HatchMind error, not an unrelated CPI/constraint error: " + String(err));
  }
  function umiFor(who: Keypair) {
    const umi = createUmi(provider.connection.rpcEndpoint, { commitment: "confirmed" }).use(mplCore());
    return umi.use(keypairIdentity(umi.eddsa.createKeypairFromSecretKey(who.secretKey)));
  }
  async function ownerOf(asset: PublicKey) {
    return (await fetchAssetV1(umiFor(user1), publicKey(asset.toBase58()), { commitment: "confirmed" })).owner.toString();
  }
  async function transfer(asset: Keypair, from: Keypair, to: Keypair) {
    const umi = umiFor(from);
    await transferV1(umi, { asset: publicKey(asset.publicKey.toBase58()), newOwner: publicKey(to.publicKey.toBase58()) })
      .sendAndConfirm(umi, { send: { preflightCommitment: "confirmed" }, confirm: { commitment: "confirmed" } });
    assert.equal(await ownerOf(asset.publicKey), to.publicKey.toBase58());
  }
  async function request(a = pets[0], b = pets[1], who = user1, ttl = 120) {
    const nonce = ++sequence;
    const address = breed(a.publicKey, b.publicKey, nonce);
    await program.methods.requestBreeding(new anchor.BN(nonce), new anchor.BN(ttl)).accountsStrict({
      config, petA: pet(a.publicKey), petB: pet(b.publicKey), assetA: a.publicKey, assetB: b.publicKey,
      request: address, requester: who.publicKey, systemProgram: SystemProgram.programId,
    }).signers([who]).rpc();
    return { address, nonce, a, b };
  }
  type Req = Awaited<ReturnType<typeof request>>;
  async function approve(r: Req, who = user2) {
    return program.methods.approveBreeding().accountsStrict({
      request: r.address, assetA: r.a.publicKey, assetB: r.b.publicKey, owner: who.publicKey,
    }).signers([who]).rpc();
  }
  function execution(r: Req, child: Keypair, who = user1, childOwner = user1.publicKey) {
    return program.methods.executeBreeding().accountsStrict({
      config, request: r.address, petA: pet(r.a.publicKey), petB: pet(r.b.publicKey),
      assetA: r.a.publicKey, assetB: r.b.publicKey, child: pet(child.publicKey), childAsset: child.publicKey,
      childOwner, payer: who.publicKey, coreProgram: core, systemProgram: SystemProgram.programId,
    }).preInstructions([budget()]).signers([who, child]);
  }
  async function execute(r: Req, who = user1) {
    const child = Keypair.generate();
    await execution(r, child, who).rpc();
    return child;
  }
  async function makeGift(asset: Keypair, who = user1, ttl = 120) {
    const nonce = ++sequence;
    const secret = randomBytes(32);
    const hash = createHash("sha256").update(secret).digest();
    const address = gift(asset.publicKey, nonce);
    await program.methods.createGiftClaim(new anchor.BN(nonce), [...hash], new anchor.BN(ttl)).accountsStrict({
      pet: pet(asset.publicKey), asset: asset.publicKey, gift: address, giver: who.publicKey,
      coreProgram: core, systemProgram: SystemProgram.programId,
    }).preInstructions([budget()]).signers([who]).rpc();
    assert.equal(await ownerOf(asset.publicKey), address.toBase58(), "actual Core asset must be escrowed");
    return { address, asset, nonce, secret };
  }
  type Gift = Awaited<ReturnType<typeof makeGift>>;
  function claim(g: Gift, who = user3, secret = g.secret) {
    return program.methods.claimEgg([...secret]).accountsStrict({
      gift: g.address, asset: g.asset.publicKey, recipient: who.publicKey,
      coreProgram: core, systemProgram: SystemProgram.programId,
    }).preInstructions([budget()]).signers([who]).rpc();
  }
  function reclaim(g: Gift, who = user1) {
    return program.methods.reclaimGift().accountsStrict({
      gift: g.address, asset: g.asset.publicKey, giver: who.publicKey,
      coreProgram: core, systemProgram: SystemProgram.programId,
    }).preInstructions([budget()]).signers([who]).rpc();
  }
  before(async () => {
    const tx = new Transaction();
    for (const w of [...wallets, stranger]) tx.add(SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey, toPubkey: w.publicKey, lamports: 10 * anchor.web3.LAMPORTS_PER_SOL,
    }));
    await provider.sendAndConfirm(tx);
    await program.methods.initialize(wallets.map(w => w.publicKey)).accountsStrict({
      config, authority: provider.wallet.publicKey, systemProgram: SystemProgram.programId,
    }).rpc();
    assert.equal((await program.account.config.fetch(config)).stageSeconds.toNumber(), 3, "must build with local-testing");
  });
  it("Genesis: user1/user2/user3/user4 receive rabbit(Dewey)/turtle(Shelly)/guinea-pig(Peachy)/weasel(Axy), one each", async () => {
    for (let i = 0; i < 4; i++) {
      await program.methods.registerPet(i).accountsStrict({
        config, pet: pet(pets[i].publicKey), asset: pets[i].publicKey, owner: wallets[i].publicKey,
        coreProgram: core, systemProgram: SystemProgram.programId,
      }).preInstructions([budget()]).signers([wallets[i], pets[i]]).rpc();
      const record = await program.account.petRecord.fetch(pet(pets[i].publicKey));
      assert.deepEqual(record.genome, Array(7).fill(i));
      assert.equal(record.stage, 0);
      assert.equal(await ownerOf(pets[i].publicKey), wallets[i].publicKey.toBase58());
    }
  });
  it("Genesis: a fifth registration cannot duplicate a species", async () => {
    const asset = Keypair.generate();
    await fails(program.methods.registerPet(0).accountsStrict({
      config, pet: pet(asset.publicKey), asset: asset.publicKey, owner: user1.publicKey,
      coreProgram: core, systemProgram: SystemProgram.programId,
    }).signers([user1, asset]).rpc(), "AlreadyRegistered");
    assert.isNull(await provider.connection.getAccountInfo(asset.publicKey));
  });
  it("S01: a non-owner cannot evolve someone else's Core asset", async () => {
    await fails(program.methods.recordEvolution(1).accountsStrict({
      config, pet: pet(pets[0].publicKey), asset: pets[0].publicKey, owner: stranger.publicKey,
    }).signers([stranger]).rpc(), "Unauthorized");
  });
  it("S06: growth cannot skip a stage", async () => {
    await fails(program.methods.recordEvolution(2).accountsStrict({
      config, pet: pet(pets[0].publicKey), asset: pets[0].publicKey, owner: user1.publicKey,
    }).signers([user1]).rpc(), "InvalidStage");
  });
  it("S06: eggs cannot breed", async () => {
    await fails(request(), "InvalidStage");
  });
  it("Growth: all founders advance egg -> baby -> growth, waiting each stage", async () => {
    for (const stage of [1, 2]) {
      const records = await Promise.all(pets.map(p => program.account.petRecord.fetch(pet(p.publicKey))));
      await until(Math.max(...records.map((r: any) => r.changedAt.toNumber() + 3)));
      for (let i = 0; i < 4; i++) {
        await program.methods.recordEvolution(stage).accountsStrict({
          config, pet: pet(pets[i].publicKey), asset: pets[i].publicKey, owner: wallets[i].publicKey,
        }).signers([wallets[i]]).rpc();
        assert.equal((await program.account.petRecord.fetch(pet(pets[i].publicKey))).stage, stage);
      }
    }
  });
  it("S03: one asset cannot breed with itself", async () => {
    await fails(request(pets[0], pets[0]), "SamePet");
  });
  it("S01: only current owner A may create a request", async () => {
    await fails(request(pets[0], pets[1], stranger), "Unauthorized");
  });
  it("S02: execute without owner B consent is rejected and leaves no egg", async () => {
    const r = await request(); const child = Keypair.generate();
    await fails(execution(r, child).rpc(), "MissingConsent");
    assert.isNull(await provider.connection.getAccountInfo(child.publicKey));
    assert.isFalse((await program.account.breedingRequest.fetch(r.address)).consumed);
  });
  it("S01: a stranger cannot approve owner B's pet", async () => {
    const r = await request();
    await fails(approve(r, stranger), "Unauthorized");
  });
  it("S04: transfer pet A after both consent -> OwnerChanged", async () => {
    const r = await request(); await approve(r);
    await transfer(pets[0], user1, user4);
    await fails(execution(r, Keypair.generate()).rpc(), "OwnerChanged");
    assert.isFalse((await program.account.breedingRequest.fetch(r.address)).consumed);
    await transfer(pets[0], user4, user1);
  });
  it("S04: transfer pet B after consent -> OwnerChanged", async () => {
    const r = await request(); await approve(r);
    await transfer(pets[1], user2, user3);
    await fails(execution(r, Keypair.generate()).rpc(), "OwnerChanged");
    await transfer(pets[1], user3, user2);
  });
  it("S11: cancelled breeding request cannot execute", async () => {
    const r = await request(); await approve(r);
    await program.methods.cancelBreeding().accountsStrict({ request: r.address, owner: user2.publicKey }).signers([user2]).rpc();
    await fails(execution(r, Keypair.generate()).rpc(), "Cancelled");
  });
  it("S01: stranger cannot cancel a breeding request", async () => {
    const r = await request();
    await fails(program.methods.cancelBreeding().accountsStrict({ request: r.address, owner: stranger.publicKey }).signers([stranger]).rpc(), "Unauthorized");
  });
  it("Expired: expired request rejects both approval and execution", async () => {
    const r = await request(pets[0], pets[1], user1, 3);
    const state = await program.account.breedingRequest.fetch(r.address);
    await until(state.expires.toNumber());
    await fails(approve(r), "Expired");
    await fails(execution(r, Keypair.generate()).rpc(), "Expired");
  });
  it("Invalid TTL: zero and negative request TTL are rejected", async () => {
    await fails(request(pets[0], pets[1], user1, 0), "InvalidTtl");
    await fails(request(pets[0], pets[1], user1, -1), "InvalidTtl");
  });
  it("S12: cooldown rechecked at execution and new request; atomic rollback verified", async () => {
    await ready();
    const first = await request(); await approve(first);
    const second = await request(); await approve(second);
    const child = Keypair.generate();
    const ix1 = await execution(first, child).instruction();
    // Build a request immediately after breeding within the SAME transaction:
    // no wall-clock timing race and failure must roll back the first birth.
    const nonce = ++sequence;
    const ixRequest = await program.methods.requestBreeding(new anchor.BN(nonce), new anchor.BN(120)).accountsStrict({
      config, petA: pet(pets[0].publicKey), petB: pet(pets[1].publicKey),
      assetA: pets[0].publicKey, assetB: pets[1].publicKey,
      request: breed(pets[0].publicKey, pets[1].publicKey, nonce), requester: user1.publicKey, systemProgram: SystemProgram.programId,
    }).instruction();
    try {
      await provider.sendAndConfirm(new Transaction().add(budget(), ix1, ixRequest), [user1, child]);
      assert.fail("expected Cooldown");
    } catch (e: any) {
      const parsed = anchor.AnchorError.parse(e.logs ?? []);
      assert.equal(parsed?.error.errorCode.code, "Cooldown");
    }
    assert.isFalse((await program.account.breedingRequest.fetch(first.address)).consumed);
    assert.isNull(await provider.connection.getAccountInfo(child.publicKey));
    // Two executions in one transaction also trigger the execution-time check.
    const child2 = Keypair.generate();
    const secondIx = await execution(second, child2).instruction();
    try {
      await provider.sendAndConfirm(new Transaction().add(budget(), ix1, secondIx), [user1, child, child2]);
      assert.fail("expected Cooldown");
    } catch (e: any) {
      const parsed = anchor.AnchorError.parse(e.logs ?? []);
      assert.equal(parsed?.error.errorCode.code, "Cooldown");
    }
    assert.isFalse((await program.account.breedingRequest.fetch(second.address)).consumed);
  });
  it("Normal breeding: two owners consent, exact SHA-256 seed and homologous inheritance recorded", async () => {
    await ready();
    const r = await request(); await approve(r);
    egg = await execute(r);
    const child = await program.account.petRecord.fetch(pet(egg.publicKey));
    const expected = createHash("sha256").update(Buffer.concat([
      Buffer.from("HM-BREED-v1"), pets[0].publicKey.toBuffer(), pets[1].publicKey.toBuffer(), le(r.nonce),
    ])).digest();
    assert.deepEqual(Buffer.from(child.seed), expected);
    assert.deepEqual(child.genome, [...expected.subarray(0, 7)].map(x => (x & 1) === 0 ? 0 : 1));
    assert.equal(child.parentA.toBase58(), pets[0].publicKey.toBase58());
    assert.equal(child.parentB.toBase58(), pets[1].publicKey.toBase58());
    assert.equal(child.stage, 0);
    assert.equal(await ownerOf(egg.publicKey), user1.publicKey.toBase58());
    assert.isTrue((await program.account.breedingRequest.fetch(r.address)).consumed);
    await fails(execution(r, Keypair.generate()).rpc(), "AlreadyConsumed");
  });
  it("S05: replay cannot issue a second egg", async () => {
    const records = await program.account.breedingRequest.all();
    const used = records.find((r: any) => r.account.consumed)!;
    const state: any = used.account;
    await fails(execution({ address: used.publicKey, nonce: state.nonce.toNumber(), a: pets[0], b: pets[1] }, Keypair.generate()).rpc(), "AlreadyConsumed");
  });
  it("Same-wallet breeding: transfer guinea pig (Peachy) user3 -> user1; user1 request alone suffices", async () => {
    await transfer(pets[2], user3, user1);
    await ready(pets[0], pets[2]);
    const r = await request(pets[0], pets[2], user1);
    const state = await program.account.breedingRequest.fetch(r.address);
    assert.isTrue(state.consentA); assert.isTrue(state.consentB);
    assert.equal(state.ownerA.toBase58(), state.ownerB.toBase58());
    secondEgg = await execute(r, user1);
    assert.equal(await ownerOf(secondEgg.publicKey), user1.publicKey.toBase58());
  });
  it("S07: next growth is too early within the same transaction", async () => {
    const r: any = await program.account.petRecord.fetch(pet(egg.publicKey));
    await until(r.changedAt.toNumber() + 3);
    const ix1 = await program.methods.recordEvolution(1).accountsStrict({
      config, pet: pet(egg.publicKey), asset: egg.publicKey, owner: user1.publicKey,
    }).instruction();
    const ix2 = await program.methods.recordEvolution(2).accountsStrict({
      config, pet: pet(egg.publicKey), asset: egg.publicKey, owner: user1.publicKey,
    }).instruction();
    try {
      await provider.sendAndConfirm(new Transaction().add(ix1, ix2), [user1]);
      assert.fail("expected TooEarly");
    } catch (e: any) { assert.equal(anchor.AnchorError.parse(e.logs ?? [])?.error.errorCode.code, "TooEarly"); }
    assert.equal((await program.account.petRecord.fetch(pet(egg.publicKey))).stage, 0, "failed atomic growth rolls back");
  });
  it("S08: wrong gift secret rejected; actual egg stays in Gift PDA", async () => {
    const g = await makeGift(egg);
    await fails(claim(g, user3, randomBytes(32)), "BadSecret");
    assert.equal(await ownerOf(egg.publicKey), g.address.toBase58());
    await claim(g);
    assert.equal(await ownerOf(egg.publicKey), user3.publicKey.toBase58());
  });
  it("S09: gift link cannot be claimed twice", async () => {
    const g = await makeGift(egg, user3);
    await claim(g, user1);
    await fails(claim(g, user4), "AlreadyClaimed");
    assert.equal(await ownerOf(egg.publicKey), user1.publicKey.toBase58());
  });
  it("S10: giver cannot reclaim before expiry", async () => {
    const g = await makeGift(egg, user1);
    await fails(reclaim(g), "NotExpired");
    await claim(g, user1);
  });
  it("S01: stranger cannot create a gift for another owner's egg", async () => {
    await fails(makeGift(egg, stranger), "Unauthorized");
  });
  it("Expired gift: claim fails at expiry; only original giver reclaims; replay rejected", async () => {
    const g = await makeGift(secondEgg, user1, 3);
    const state = await program.account.giftClaim.fetch(g.address);
    await until(state.expires.toNumber());
    await fails(claim(g, user3), "Expired");
    await fails(reclaim(g, stranger), "Unauthorized");
    assert.equal(await ownerOf(secondEgg.publicKey), g.address.toBase58());
    await reclaim(g);
    assert.equal(await ownerOf(secondEgg.publicKey), user1.publicKey.toBase58());
    assert.isTrue((await program.account.giftClaim.fetch(g.address)).reclaimed);
    await fails(reclaim(g), "AlreadyClaimed");
    await fails(claim(g), "AlreadyClaimed");
  });
  it("Growth: current Core owner can evolve through final stage; reverse and further evolution rejected", async () => {
    for (const stage of [1, 2, 3]) {
      const state = await program.account.petRecord.fetch(pet(secondEgg.publicKey));
      await until(state.changedAt.toNumber() + 3);
      await program.methods.recordEvolution(stage).accountsStrict({
        config, pet: pet(secondEgg.publicKey), asset: secondEgg.publicKey, owner: user1.publicKey,
      }).signers([user1]).rpc();
    }
    for (const stage of [2, 4]) {
      await fails(program.methods.recordEvolution(stage).accountsStrict({
        config, pet: pet(secondEgg.publicKey), asset: secondEgg.publicKey, owner: user1.publicKey,
      }).signers([user1]).rpc(), "InvalidStage");
    }
  });
  describe("추가 검증: 기존 27개 실행 후 독립 자식·지갑 사용", function () {
    const alice = Keypair.generate(), bob = Keypair.generate(), relay = Keypair.generate();
    let a: Keypair, b: Keypair;
    const observations: any[] = [];
    let successfulBirth: { asset: Keypair; r: Req; signature: string };
    function note(id: string, result: unknown) {
      observations.push({ id, result });
      mkdirSync(".local", { recursive: true });
      writeFileSync(".local/observations.json", JSON.stringify(observations, null, 2));
    }
    async function snapshot(keys: PublicKey[]) {
      return (await provider.connection.getMultipleAccountsInfo(keys, "confirmed")).map(x => x && ({
        owner: x.owner.toBase58(), lamports: x.lamports, data: x.data.toString("base64"),
      }));
    }
    async function unchanged(keys: PublicKey[], action: () => Promise<unknown>, error: string) {
      const previous = await snapshot(keys);
      await fails(action(), error);
      assert.deepEqual(await snapshot(keys), previous, "실패 후 계정 상태가 바뀌면 안 됩니다");
    }
    async function absent(asset: Keypair) {
      assert.isNull(await provider.connection.getAccountInfo(asset.publicKey));
      assert.isNull(await provider.connection.getAccountInfo(pet(asset.publicKey)));
    }
    async function alreadyUsed(action: Promise<unknown>) {
      let error: any;
      try { await action; } catch (e) { error = e; }
      assert.exists(error, "기존 계정의 재초기화는 거절되어야 합니다");
      assert.match(String(error) + JSON.stringify(error.logs || []), /already in use|already been allocated/i);
    }
    async function mature(asset: Keypair, owner: Keypair, target = 2) {
      let record = await program.account.petRecord.fetch(pet(asset.publicKey));
      while (record.stage < target) {
        await until(record.changedAt.toNumber() + 3);
        await program.methods.recordEvolution(record.stage + 1).accountsStrict({
          config, pet: pet(asset.publicKey), asset: asset.publicKey, owner: owner.publicKey,
        }).signers([owner]).rpc();
        record = await program.account.petRecord.fetch(pet(asset.publicKey));
      }
    }
    async function mintChild() {
      await ready(a, b);
      const r = await request(a, b, alice); await approve(r, bob);
      const asset = Keypair.generate();
      const signature = await execution(r, asset, alice, alice.publicKey).rpc();
      return { asset, r, signature };
    }
    function duplicate(r: Req) {
      return program.methods.requestBreeding(new anchor.BN(r.nonce), new anchor.BN(120)).accountsStrict({
        config, petA: pet(r.a.publicKey), petB: pet(r.b.publicKey), assetA: r.a.publicKey, assetB: r.b.publicKey,
        request: r.address, requester: alice.publicKey, systemProgram: SystemProgram.programId,
      }).signers([alice]).rpc();
    }
    before(async () => {
      const funding = new Transaction();
      for (const owner of [alice, bob, relay]) funding.add(SystemProgram.transfer({ fromPubkey: provider.wallet.publicKey, toPubkey: owner.publicKey, lamports: 5 * anchor.web3.LAMPORTS_PER_SOL }));
      await provider.sendAndConfirm(funding);
      const foundersChild = async (owner: Keypair) => {
        await ready(pets[0], pets[1]); const r = await request(); await approve(r);
        const child = await execute(r); await transfer(child, user1, owner); return child;
      };
      a = await foundersChild(alice); b = await foundersChild(bob);
      let attempts = 0;
      while (JSON.stringify((await program.account.petRecord.fetch(pet(a.publicKey))).genome) === JSON.stringify((await program.account.petRecord.fetch(pet(b.publicKey))).genome)) {
        assert.isBelow(attempts++, 8); b = await foundersChild(bob);
      }
      await mature(a, alice); await mature(b, bob);
    });
    it("S13: child_owner를 실행자·제3자로 바꾸면 Unauthorized, 자식 미생성", async () => {
      await ready(a, b); const r = await request(a, b, alice); await approve(r, bob);
      for (const owner of [relay.publicKey, stranger.publicKey]) {
        const child = Keypair.generate();
        await unchanged([r.address, pet(a.publicKey), pet(b.publicKey)], () => execution(r, child, relay, owner).rpc(), "Unauthorized");
        await absent(child);
      }
    });
    it("S14: 비Core 자산은 PDA 제약으로 선행 거절, handler는 독립 fixture에서 검증", async () => {
      for (const fake of [relay.publicKey, config]) {
        await unchanged([pet(a.publicKey)], () => program.methods.recordEvolution(3).accountsStrict({ config, pet: pet(a.publicKey), asset: fake, owner: alice.publicKey }).signers([alice]).rpc(), "ConstraintSeeds");
        for (const side of ["a", "b"]) {
          const nonce = ++sequence, aa = side === "a" ? fake : a.publicKey, bb = side === "b" ? fake : b.publicKey;
          const address = breed(aa, bb, nonce);
          await unchanged([pet(a.publicKey), pet(b.publicKey)], () => program.methods.requestBreeding(new anchor.BN(nonce), new anchor.BN(120)).accountsStrict({ config, petA: pet(a.publicKey), petB: pet(b.publicKey), assetA: aa, assetB: bb, request: address, requester: alice.publicKey, systemProgram: SystemProgram.programId }).signers([alice]).rpc(), "ConstraintSeeds");
          assert.isNull(await provider.connection.getAccountInfo(address));
        }
      }
    });
    it("S15: 다른 PetRecord를 pet_a로 전달하면 ConstraintSeeds, 요청 미생성", async () => {
      const nonce = ++sequence, address = breed(a.publicKey, b.publicKey, nonce);
      await unchanged([pet(a.publicKey), pet(b.publicKey)], () => program.methods.requestBreeding(new anchor.BN(nonce), new anchor.BN(120)).accountsStrict({ config, petA: pet(b.publicKey), petB: pet(b.publicKey), assetA: a.publicKey, assetB: b.publicKey, request: address, requester: alice.publicKey, systemProgram: SystemProgram.programId }).signers([alice]).rpc(), "ConstraintSeeds");
      assert.isNull(await provider.connection.getAccountInfo(address));
    });
    it("S16: initialize 재호출은 기존 계정 오류, config 불변", async () => {
      const previous = await snapshot([config]);
      await alreadyUsed(program.methods.initialize(wallets.map(w => w.publicKey)).accountsStrict({ config, authority: provider.wallet.publicKey, systemProgram: SystemProgram.programId }).rpc());
      assert.deepEqual(await snapshot([config]), previous);
    });
    it("S17: 비founder는 Unauthorized, species>=4는 InvalidFounder, 등록 미생성", async () => {
      for (const [species, error] of [[0, "Unauthorized"], [4, "InvalidFounder"]] as const) {
        const child = Keypair.generate();
        await unchanged([config], () => program.methods.registerPet(species).accountsStrict({ config, pet: pet(child.publicKey), asset: child.publicKey, owner: relay.publicKey, coreProgram: core, systemProgram: SystemProgram.programId }).signers([relay, child]).rpc(), error);
        await absent(child);
      }
    });
    it("S18: 같은 부모·nonce 재요청은 기존 계정 오류, 요청 불변", async () => {
      await ready(a, b); const r = await request(a, b, alice), previous = await snapshot([r.address]);
      await alreadyUsed(duplicate(r)); assert.deepEqual(await snapshot([r.address]), previous);
    });
    it("S19: 취소 후 승인 Cancelled, 실행 후 취소 AlreadyConsumed, A의 B 대신 승인 Unauthorized", async () => {
      await ready(a, b); const cancelled = await request(a, b, alice);
      await program.methods.cancelBreeding().accountsStrict({ request: cancelled.address, owner: alice.publicKey }).signers([alice]).rpc();
      await unchanged([cancelled.address], () => approve(cancelled, bob), "Cancelled");
      const done = await mintChild();
      await unchanged([done.r.address], () => program.methods.cancelBreeding().accountsStrict({ request: done.r.address, owner: alice.publicKey }).signers([alice]).rpc(), "AlreadyConsumed");
      await ready(a, b); const waiting = await request(a, b, alice);
      await unchanged([waiting.address], () => approve(waiting, alice), "Unauthorized");
    });
    it("S20: 성장한 펫 선물 InvalidStage, 0 secret_hash BadSecret, 소유자 불변", async () => {
      const grown = await mintChild(); await mature(grown.asset, alice, 1);
      const egg = await mintChild();
      for (const [asset, hash, error] of [[grown.asset, [...randomBytes(32)], "InvalidStage"], [egg.asset, Array(32).fill(0), "BadSecret"]] as const) {
        const nonce = ++sequence, address = gift(asset.publicKey, nonce);
        await unchanged([asset.publicKey, pet(asset.publicKey)], () => program.methods.createGiftClaim(new anchor.BN(nonce), [...hash], new anchor.BN(120)).accountsStrict({ pet: pet(asset.publicKey), asset: asset.publicKey, gift: address, giver: alice.publicKey, coreProgram: core, systemProgram: SystemProgram.programId }).preInstructions([budget()]).signers([alice]).rpc(), error);
        assert.isNull(await provider.connection.getAccountInfo(address));
        assert.equal(await ownerOf(asset.publicKey), alice.publicKey.toBase58());
      }
    });
    it("S21: 제3자 payer로 실행 성공, 자식 소유자는 owner_a", async () => {
      await ready(a, b); const r = await request(a, b, alice); await approve(r, bob);
      const asset = Keypair.generate(), signature = await execution(r, asset, relay, alice.publicKey).rpc();
      successfulBirth = { asset, r, signature };
      assert.equal(await ownerOf(asset.publicKey), alice.publicKey.toBase58());
      assert.isTrue((await program.account.breedingRequest.fetch(r.address)).consumed);
    });
    it("R01 RISK: 공개 seed로 nonce를 골라 목표 genome의 자식을 실제 발행", async () => {
      const { findNonce } = require("../scripts/nonce-grind.cjs");
      const pa = await program.account.petRecord.fetch(pet(a.publicKey));
      const pb = await program.account.petRecord.fetch(pet(b.publicKey));
      const target = pa.genome.map((value: number, i: number) => i % 2 ? pb.genome[i] : value);
      const result = findNonce({ assetA: a.publicKey.toBase58(), assetB: b.publicKey.toBase58(), genomeA: pa.genome, genomeB: pb.genome, target, startNonce: 1000000n });
      await ready(a, b);
      const nonce = Number(result.nonce), r = { a, b, nonce, address: breed(a.publicKey, b.publicKey, nonce) };
      await duplicate(r); await approve(r, bob);
      const child = Keypair.generate(); await execution(r, child, alice, alice.publicKey).rpc();
      const record = await program.account.petRecord.fetch(pet(child.publicKey));
      assert.deepEqual(record.genome, target, "고른 nonce가 실제 온체인 유전을 조절합니다");
      assert.equal(Buffer.from(record.seed).toString("hex"), result.seed);
      const loci = pa.genome.filter((v: number, i: number) => v !== pb.genome[i]).length;
      note("R01", { verdict: "RISK 재현", ...result, differing_loci: loci, possible_genomes: 2 ** loci, target });
    });
    it("R02 RISK: 비밀값을 아는 제3자가 먼저 선물을 청구해 소유권 획득", async () => {
      const { asset } = await mintChild(), g = await makeGift(asset, alice);
      await claim(g, relay);
      assert.equal(await ownerOf(asset.publicKey), relay.publicKey.toBase58());
      assert.isTrue((await program.account.giftClaim.fetch(g.address)).claimed);
      await unchanged([g.address, asset.publicKey], () => claim(g, bob), "AlreadyClaimed");
      note("R02", { verdict: "RISK 재현", recipient_bound: false, third_party_claimed: true });
    });
    function coreFailure(error: any) {
      const details = [String(error), JSON.stringify(error?.logs || []), String(error?.cause), JSON.stringify(error?.cause?.logs || [])].join("\n");
      const match = details.match(new RegExp("Program " + core.toBase58() + " failed: custom program error: (0x[0-9a-f]+)", "i"));
      const code = match ? Number(match[1]) : error?.code;
      assert.isNumber(code, "Core 오류 코드가 있어야 합니다: " + details);
      const decoded = getMplCoreErrorFromCode(code, umiFor(alice).programs.get("mplCore"));
      assert.exists(decoded, "고정 SDK가 인식하는 Core 오류여야 합니다: " + details);
      return { name: decoded!.name, code, message: decoded!.message };
    }
    it("C01: 부모 burn 뒤 요청·실행은 InvalidCoreAsset, PetRecord는 남음", async () => {
      const { asset } = await mintChild(); await mature(asset, alice);
      await ready(asset, a);
      const r = await request(asset, a, alice);
      assert.isTrue((await program.account.breedingRequest.fetch(r.address)).consentB);
      const umi = umiFor(alice);
      await burnV1(umi, { asset: publicKey(asset.publicKey.toBase58()) }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });
      const tombstone = await provider.connection.getAccountInfo(asset.publicKey);
      assert.exists(tombstone); assert.equal(tombstone!.data.length, 1);
      const previous = await snapshot([pet(asset.publicKey), pet(a.publicKey), r.address]);
      const nonce = ++sequence, next = { a: asset, b: a, nonce, address: breed(asset.publicKey, a.publicKey, nonce) };
      await fails(duplicate(next), "InvalidCoreAsset");
      assert.isNull(await provider.connection.getAccountInfo(next.address));
      const child = Keypair.generate(); await fails(execution(r, child, alice, alice.publicKey).rpc(), "InvalidCoreAsset");
      await absent(child);
      assert.deepEqual(await snapshot([pet(asset.publicKey), pet(a.publicKey), r.address]), previous);
      assert.isFalse((await program.account.breedingRequest.fetch(r.address)).consumed);
      note("C01", { verdict: "PASS", request: "InvalidCoreAsset", execute: "InvalidCoreAsset", record_survives: true, tombstone_bytes: tombstone!.data.length, tombstone_lamports: tombstone!.lamports, tombstone_owner: tombstone!.owner.toBase58() });
    });
    it("C02: FreezeDelegate 알 선물의 실제 Core 결과와 롤백 관찰", async () => {
      const { asset } = await mintChild(), umi = umiFor(alice);
      await addPlugin(umi, { asset: publicKey(asset.publicKey.toBase58()), plugin: { type: "FreezeDelegate", frozen: true } }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });
      assert.isTrue((await fetchAsset(umi, publicKey(asset.publicKey.toBase58()))).freezeDelegate!.frozen);
      const nonce = ++sequence, address = gift(asset.publicKey, nonce), previous = await snapshot([asset.publicKey, pet(asset.publicKey)]);
      let error: any;
      try {
        await program.methods.createGiftClaim(new anchor.BN(nonce), [...randomBytes(32)], new anchor.BN(120)).accountsStrict({ pet: pet(asset.publicKey), asset: asset.publicKey, gift: address, giver: alice.publicKey, coreProgram: core, systemProgram: SystemProgram.programId }).preInstructions([budget()]).signers([alice]).rpc();
      } catch (e) { error = e; }
      if (error) {
        const observed = coreFailure(error);
        assert.deepEqual(await snapshot([asset.publicKey, pet(asset.publicKey)]), previous);
        assert.isNull(await provider.connection.getAccountInfo(address));
        assert.equal(await ownerOf(asset.publicKey), alice.publicKey.toBase58());
        note("C02", { verdict: "관찰", gift_succeeded: false, error: observed, state_unchanged: true });
      } else {
        assert.equal(await ownerOf(asset.publicKey), address.toBase58());
        assert.isFalse((await program.account.giftClaim.fetch(address)).claimed);
        note("C02", { verdict: "관찰", gift_succeeded: true, escrow_owner: true });
      }
    });
    it("C03: 선물 전 Transfer/BurnDelegate가 청구 후 남는지, 이전 위임 공격 관찰", async () => {
      const results = [];
      for (const attack of ["transfer", "burn"]) {
        const { asset } = await mintChild(), umi = umiFor(alice), assetKey = publicKey(asset.publicKey.toBase58());
        for (const type of ["TransferDelegate", "BurnDelegate"] as const) {
          await addPlugin(umi, { asset: assetKey, plugin: { type, authority: { type: "Address", address: publicKey(relay.publicKey.toBase58()) } } }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });
        }
        const delegated = await fetchAsset(umi, assetKey);
        for (const plugin of [delegated.transferDelegate!, delegated.burnDelegate!]) {
          assert.equal(plugin.authority.type, "Address");
          assert.equal((plugin.authority as any).address.toString(), relay.publicKey.toBase58());
        }
        const g = await makeGift(asset, alice); await claim(g, bob);
        assert.equal(await ownerOf(asset.publicKey), bob.publicKey.toBase58());
        const received = await fetchAsset(umi, assetKey);
        const authorities = { transfer: received.transferDelegate!.authority, burn: received.burnDelegate!.authority };
        const previous = await snapshot([asset.publicKey, pet(asset.publicKey), g.address]);
        const delegate = umiFor(relay); let error: any;
        try {
          const builder = attack === "transfer" ? transferV1(delegate, { asset: assetKey, newOwner: publicKey(alice.publicKey.toBase58()) }) : burnV1(delegate, { asset: assetKey });
          await builder.sendAndConfirm(delegate, { confirm: { commitment: "confirmed" } });
        } catch (e) { error = e; }
        if (error) {
          const observed = coreFailure(error);
          assert.deepEqual(await snapshot([asset.publicKey, pet(asset.publicKey), g.address]), previous);
          assert.equal(await ownerOf(asset.publicKey), bob.publicKey.toBase58());
          results.push({ attack, succeeded: false, authorities, error: observed });
        } else {
          if (attack === "transfer") assert.equal(await ownerOf(asset.publicKey), alice.publicKey.toBase58());
          else assert.equal((await provider.connection.getAccountInfo(asset.publicKey))!.data.length, 1);
          results.push({ attack, succeeded: true, authorities });
        }
      }
      note("C03", { verdict: results.some(r => r.succeeded) ? "RISK 재현" : "관찰", results });
    });
    it("O02: 명령 10개의 성공 트랜잭션 CU·신규 계정 rent를 실제 측정", async () => {
      const instructions = program.idl.instructions.map(ix => ix.name);
      assert.lengthOf(instructions, 10);
      for (const name of instructions) {
        const samples = costs.filter(s => s.instruction === name);
        assert.isNotEmpty(samples, name + "의 성공 트랜잭션 측정 누락");
        for (const sample of samples) {
          assert.isAbove(sample.compute_units, 0);
          assert.isString(sample.signature);
          for (const account of sample.created) assert.isAtLeast(account.lamports, account.rent_exempt_minimum);
        }
      }
      note("O02", { verdict: "PASS", instruction_count: instructions.length, successful_samples: costs.length });
    });
    it("O03: BirthEvent child·parents·seed가 실제 자식 PetRecord와 일치", async () => {
      const tx = await provider.connection.getTransaction(successfulBirth.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      assert.isNull(tx!.meta!.err);
      const events = [...new anchor.EventParser(program.programId, program.coder).parseLogs(tx!.meta!.logMessages!)];
      const births = events.filter(event => event.name.toLowerCase() === "birthevent");
      assert.lengthOf(births, 1);
      const event: any = births[0].data, record = await program.account.petRecord.fetch(pet(successfulBirth.asset.publicKey));
      assert.equal(event.child.toBase58(), record.asset.toBase58());
      assert.equal(event.parentA.toBase58(), record.parentA.toBase58());
      assert.equal(event.parentB.toBase58(), record.parentB.toBase58());
      assert.deepEqual(event.seed, record.seed);
      note("O03", { verdict: "PASS", signature: successfulBirth.signature, matched_fields: ["child", "parent_a", "parent_b", "seed"] });
    });
  });
});
