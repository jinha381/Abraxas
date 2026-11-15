import * as anchor from "@coral-xyz/anchor";
import { mkdirSync, writeFileSync } from "fs";
const bs58 = require("bs58");
export const costs: any[] = [];
export function recordCosts(provider: anchor.AnchorProvider, program: anchor.Program<any>) {
  const send = provider.sendAndConfirm.bind(provider);
  provider.sendAndConfirm = async (...args: Parameters<typeof send>) => {
    const signature = await send(...args);
    let tx: any;
    for (let attempt = 0; attempt < 30; attempt++) {
      tx = await provider.connection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      if (tx) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!tx || tx.meta?.err) throw new Error("비용 측정용 성공 트랜잭션 메타데이터가 없습니다: " + signature);
    const instructions = tx.transaction.message.instructions.filter((ix: any) => ix.programId.equals(program.programId));
    if (instructions.length !== 1) return signature;
    const ix = instructions[0], discriminator = [...bs58.decode(ix.data).subarray(0, 8)];
    const def: any = program.idl.instructions.find((entry: any) => JSON.stringify(entry.discriminator) === JSON.stringify(discriminator));
    if (!def) throw new Error("비용 측정에서 알 수 없는 명령 discriminator");
    if (typeof tx.meta.computeUnitsConsumed !== "number") throw new Error("computeUnitsConsumed가 없습니다");
    const created = [];
    for (let i = 0; i < tx.meta.preBalances.length; i++) {
      if (tx.meta.preBalances[i] !== 0 || tx.meta.postBalances[i] <= 0) continue;
      const address = tx.transaction.message.accountKeys[i].pubkey;
      const account = await provider.connection.getAccountInfo(address, "confirmed");
      if (!account || account.executable || (!account.owner.equals(program.programId) && account.owner.toBase58() !== "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d")) continue;
      const role = ix.accounts.findIndex((key: any) => key.equals(address));
      created.push({ address: address.toBase58(), role: def.accounts[role]?.name || "unknown", owner: account.owner.toBase58(), bytes: account.data.length,
        lamports: account.lamports, sol: account.lamports / anchor.web3.LAMPORTS_PER_SOL,
        rent_exempt_minimum: await provider.connection.getMinimumBalanceForRentExemption(account.data.length) });
    }
    costs.push({ instruction: def.name, signature, slot: tx.slot, compute_units: tx.meta.computeUnitsConsumed, fee_lamports: tx.meta.fee, created });
    mkdirSync(".local", { recursive: true });
    writeFileSync(".local/cost-results.json", JSON.stringify({ date: new Date().toISOString(), network: provider.connection.rpcEndpoint, samples: costs }, null, 2));
    return signature;
  };
}
