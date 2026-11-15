import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import type { Hatchmind } from "../target/types/hatchmind";

// 미초기화 config가 필요하므로 기존 27개와 분리한 로컬 검증기에서 호출합니다.
export function initializationChecks(provider: anchor.AnchorProvider, program: anchor.Program<Hatchmind>, founders: Keypair[], attacker: Keypair, note: (id: string, value: unknown) => void) {
  const config = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId)[0];
  before(async () => {
    assert.match(provider.connection.rpcEndpoint, /^http:\/\/(127\.0\.0\.1|localhost):/, "local validator only");
    assert.isNull(await provider.connection.getAccountInfo(config), "독립 검증기에 config가 없어야 합니다");
    await provider.sendAndConfirm(new Transaction().add(SystemProgram.transfer({ fromPubkey: provider.wallet.publicKey, toPubkey: attacker.publicKey, lamports: 5e9 })));
  });
  it("S16: 초기 config 없이 0·중복 founders를 simulate하면 InvalidFounder, 생성 없음", async () => {
    const valid = founders.map(k => k.publicKey);
    for (const keys of [[PublicKey.default, ...valid.slice(1)], [valid[0], valid[0], valid[2], valid[3]]]) {
      let error: any;
      try {
        await program.methods.initialize(keys).accountsStrict({ config, authority: attacker.publicKey, systemProgram: SystemProgram.programId }).signers([attacker]).simulate();
      } catch (e) { error = e; }
      assert.equal(error?.error?.errorCode?.code, "InvalidFounder", String(error));
      assert.isNull(await provider.connection.getAccountInfo(config));
    }
    note("S16", { invalid_founders: "InvalidFounder", method: "독립 로컬 검증기에서 simulate", config_created: false });
  });
  it("R03 RISK: 배포 키와 무관한 제3자가 initialize를 선점해 authority가 됨", async () => {
    assert.notEqual(attacker.publicKey.toBase58(), provider.wallet.publicKey.toBase58());
    await program.methods.initialize(founders.map(k => k.publicKey)).accountsStrict({ config, authority: attacker.publicKey, systemProgram: SystemProgram.programId }).signers([attacker]).rpc();
    const state = await program.account.config.fetch(config);
    assert.equal(state.authority.toBase58(), attacker.publicKey.toBase58());
    assert.deepEqual(state.founders.map(k => k.toBase58()), founders.map(k => k.publicKey.toBase58()));
    note("R03", { verdict: "RISK 재현", unauthorized_first_initializer_succeeded: true, stage_seconds: state.stageSeconds.toNumber() });
  });
}

