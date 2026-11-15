"use strict";
const fs = require("node:fs"), assert = require("node:assert/strict");
const data = JSON.parse(fs.readFileSync(".local/cost-results.json", "utf8"));
const names = ["initialize", "registerPet", "recordEvolution", "requestBreeding", "approveBreeding", "cancelBreeding", "executeBreeding", "createGiftClaim", "claimEgg", "reclaimGift"];
const snake = name => name.replace(/[A-Z]/g, c => "_" + c.toLowerCase());
const money = value => `${value.toLocaleString("en-US")} / ${(value / 1e9).toFixed(9)}`;
const lines = ["# 명령별 실제 실행 비용", "", `- 측정 시각(UTC): ${data.date}`, `- RPC: \`${data.network}\` (로컬 검증기)`, "- Anchor 0.30.1, Core 프로그램 0.15.3, JS SDK 1.1.0, Umi 0.9.2, local-testing 3초 설정.", "- 성공 트랜잭션의 RPC 메타데이터 `computeUnitsConsumed`, `fee`, `preBalances`/`postBalances`를 읽고 생성 직후 계정과 rent-exemption 최소액을 조회했습니다.", "- CU는 Core CPI와 ComputeBudget 명령을 포함한 **트랜잭션 전체** 값입니다. 명령별 첫 성공을 대표값으로 쓰며 전체 표본의 최소~최대도 표시합니다. 실행 경로·PDA bump·플러그인에 따라 달라집니다.", "- rent 최소액은 계정 크기별 RPC 최소값입니다. 실제 신규 계정 예치액도 함께 적었습니다. Core 예치액은 최소 rent보다 클 수 있습니다. 수수료와 rent를 합치거나 환급 가능액으로 단정하지 않습니다.", "", "| 명령 | CU 대표 (최소~최대) | 표본 | 신규 계정 | rent 최소 lamports / SOL | 실제 예치 lamports / SOL | tx 수수료 lamports |", "|---|---:|---:|---|---:|---:|---:|"];
const chosen = [];
for (const name of names) {
  const samples = data.samples.filter(s => s.instruction === name); assert.ok(samples.length, name);
  const sample = samples[0], units = samples.map(s => s.compute_units); assert.ok(units.every(n => Number.isFinite(n) && n > 0));
  const rent = sample.created.reduce((n, a) => n + a.rent_exempt_minimum, 0), deposit = sample.created.reduce((n, a) => n + a.lamports, 0);
  lines.push(`| ${snake(name)} | ${sample.compute_units} (${Math.min(...units)}~${Math.max(...units)}) | ${samples.length} | ${sample.created.map(a => `${a.role}(${a.bytes}B)`).join(", ") || "없음"} | ${money(rent)} | ${money(deposit)} | ${sample.fee_lamports} |`);
  chosen.push(sample);
}
lines.push("", "## 대표 트랜잭션 근거", "", "로컬 서명은 공개 Explorer에서 조회되지 않습니다. 원시 로그는 Git 제외 파일 `.local/cost-results.json`에 남습니다.", "", "| 명령 | slot | 서명 |", "|---|---:|---|");
lines.push(...chosen.map(s => `| ${snake(s.instruction)} | ${s.slot} | \`${s.signature}\` |`));
lines.push("", "## 대표 신규 계정 상세", "", "| 명령 / 계정 | 크기(B) | rent 최소 lamports | 실제 예치 lamports |", "|---|---:|---:|---:|");
for (const sample of chosen) for (const a of sample.created) lines.push(`| ${snake(sample.instruction)} / ${a.role} | ${a.bytes} | ${a.rent_exempt_minimum} | ${a.lamports} |`);
lines.push("", "재생성: `node scripts/cost-report.cjs` (실제 실행한 cost-results.json 필요). 실패 트랜잭션·프로그램 배포비·SDK 플러그인 변경 비용은 이 표의 측정 범위에 포함하지 않습니다.", "");
fs.writeFileSync("docs/COSTS.md", lines.join("\n"));
console.log("COSTS: 10 instructions, " + data.samples.length + " successful samples");
