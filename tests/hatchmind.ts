import * as anchor from "@coral-xyz/anchor";
import type { Hatchmind } from "../target/types/hatchmind";
import { assert } from "chai";
import { createHash, randomBytes } from "crypto";
import { Keypair, PublicKey, SystemProgram, Transaction, SYSVAR_CLOCK_PUBKEY, ComputeBudgetProgram } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { mplCore, transferV1, fetchAssetV1 } from "@metaplex-foundation/mpl-core";

describe("HatchMind local on-chain integration", function () {
  this.timeout(180000);
  const environment = anchor.AnchorProvider.env();
  const provider = new anchor.AnchorProvider(environment.connection, environment.wallet,
    { commitment: "confirmed", preflightCommitment: "confirmed" });
  assert.match(provider.connection.rpcEndpoint, /^http:\/\/(127\.0\.0\.1|localhost):/, "local validator only");
  anchor.setProvider(provider);
  const program = anchor.workspace.Hatchmind as anchor.Program<Hatchmind>;
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
});
