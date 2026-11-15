#!/usr/bin/env python3
"""실제 로컬 실행 산출물만 읽어 테스트별 시간·관찰 결과를 생성합니다."""
import argparse
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--rust-timing-log", type=Path)
parser.add_argument("--production-build-log", type=Path)
args = parser.parse_args()
local = root / ".local"
data = json.loads((local / "onchain-results.json").read_text())
rust_names = re.findall(r"^test (\S+) \.\.\. ok$", (local / "logic-test.log").read_text(), re.M)
rule_names = [name for name in rust_names if not name.startswith("prop_")]
prop_names = [name for name in rust_names if name.startswith("prop_")]
assert len(rule_names) == 21 and len(prop_names) == 4, (rule_names, prop_names)

def passed(result, minimum):
    assert result["stats"]["failures"] == 0 and result["stats"]["pending"] == 0, result["stats"]
    assert len(result["tests"]) >= minimum and result["stats"]["passes"] == len(result["tests"])
    assert all(test["status"] == "PASS" for test in result["tests"])

passed(data, 43)
for ident in [*(f"S{i}" for i in range(13, 22)), "R01", "R02", "C01", "C02", "C03", "O02", "O03"]:
    assert any(test["name"].startswith(ident) for test in data["tests"]), ident
timing_file = args.rust_timing_log or local / "rust-timing.jsonl"
events = [json.loads(line) for line in timing_file.read_text().splitlines() if line.startswith("{")]
results = [e for e in events if e.get("type") == "test" and e.get("event") in ("ok", "failed", "ignored")]
assert len(results) == len(rust_names) and all(e["event"] == "ok" for e in results)
assert {e["name"] for e in results} == set(rust_names)
times = {e["name"]: f"{e['exec_time'] * 1000:.6f}" for e in results}
build = (local / "anchor-build.log").read_text()
assert "Finished" in build and "Stack offset" not in build
assert "Done in" in (local / "typecheck.log").read_text()
production_file = local / "production-results.json"
production = json.loads(production_file.read_text()) if production_file.exists() else None
if production:
    passed(production, 4)
    production_log = (args.production_build_log or local / "production-build.log").read_text()
    assert "Finished" in production_log and "Stack offset" not in production_log
    assert (local / "production-binary.sha256").is_file()
observations = json.loads((local / "observations.json").read_text())
if production:
    observations += json.loads((local / "production-observations.json").read_text())
by_id = {entry["id"]: entry["result"] for entry in observations}
assert all(ident in by_id for ident in ["R01", "R02", "C01", "C02", "C03", "O02", "O03"])
total = len(data["tests"]) + (len(production["tests"]) if production else 0)
lines = ["# 최종 로컬 테스트 결과", "",
         f"- 3초 local-testing 실행 종료(UTC): {data['date']}",
         f"- 순수 Rust: {len(rule_names)} 통과 / 0 실패 / 0 보류 (기존 21개 유지)",
         f"- proptest: {len(prop_names)} 통과 / 0 실패 / 0 보류, 각 512표본 (총 2048표본)",
         f"- 온체인: 총 {total} 통과 / 0 실패 / 0 보류. 3초 설정 {len(data['tests'])}개(기존 27 + 추가 {len(data['tests']) - 27}개)" + (f", 독립 운영 설정 {len(production['tests'])}개." if production else "."),
         "- Anchor 0.30.1 SBF·IDL 빌드 및 TypeScript 타입 검사: 성공",
         *([f"- 운영 빌드 실행 종료(UTC): {production['date']}", "- local-testing 없는 별도 산출물을 독립 로컬 검증기에 로드: stage_seconds=2592000, 즉시 성장 TooEarly."] if production else ["- 독립 운영 빌드 테스트: 미실행"]),
         "- 네트워크: localhost만 실행. devnet·mainnet 배포/에어드롭 없음.",
         "- RISK 테스트의 PASS는 **현재 허용되는 공격의 성공 재현**을 뜻합니다. 취약점이 수정되었다는 의미가 아닙니다.", "",
         "## 재현 명령", "", "```bash", "bash scripts/check-production.sh", "bash scripts/check.sh", "```", "",
         "check.sh: cargo test --locked → 개별 Rust 시간 수집 → keys sync → 3초 SBF·IDL 빌드 → 타입 검사 → 온체인 테스트 → 비용·결과 문서 생성. 단계가 실패하면 중단합니다.",
         "운영 검증기는 별도 포트·ledger·컴파일 캐시·산출물 경로를 사용합니다. 기존 config가 없는 동일 프로그램 ID 인스턴스이며, 프로그램 소스나 계정 레이아웃을 바꾸지 않습니다.", "",
         "## Rust 테스트별 결과", "",
         "시간은 동일하게 빌드된 테스트 바이너리를 libtest JSON으로 추가 실행해 측정했습니다. RUSTC_BOOTSTRAP=1은 테스트 실행기의 시간 출력 옵션에만 적용하며 컴파일에는 적용하지 않습니다. 0에 가까운 수치는 단일 테스트의 실측 시간이며 벤치마크는 아닙니다.", "",
         "| 테스트 | 구분 | 결과 | 시간(ms) |", "|---|---|---|---:|"]
lines += [f"| {name} | {'proptest 512표본' if name.startswith('prop_') else '기존 규칙'} | PASS | {times[name]} |" for name in rust_names]

def test_table(title, result):
    lines.extend(["", f"## {title}", "", "| 테스트 | 결과 | 시간(ms) |", "|---|---|---:|"])
    lines.extend(f"| {t['name'].replace('|', '/')} | {t['status']} | {t.get('duration_ms', 0)} |" for t in result["tests"])

test_table("3초 local-testing 온체인 테스트", data)
if production:
    test_table("독립 30일 운영 빌드 온체인 테스트", production)
lines += ["", "## 추가 검증·위험 관찰 원시 결과", "",
          "S14는 정상 PetRecord와 다른 자산을 전달할 때 PDA 제약이 먼저 거절되는 경우와, genesis에만 주입 가능한 비Core/PetRecord 조합의 handler 검증을 구분합니다. 후자는 공격자가 실제로 만들 수 있는 상태라고 주장하지 않습니다.",
          "S16의 0·중복 founders는 미초기화 검증기에 서명된 v0 트랜잭션을 simulateTransaction(sigVerify=true)하여 확인합니다. 기존 config가 있는 검증기의 재호출 실패로 대체하지 않았습니다.", ""]
for ident in sorted(by_id):
    lines.extend([f"### {ident}", "", "```json", json.dumps(by_id[ident], ensure_ascii=False, indent=2), "```", ""])
lines += ["## 비용·Pages·devnet", "",
          "- 명령 10개 CU·rent 실측: [COSTS.md](COSTS.md).",
          "- Pages 이미지 95개 참조 조사와 빌드 크기: [PAGES_ASSETS.md](PAGES_ASSETS.md).",
          "- devnet은 사용자 승인 전 미실행: [DEVNET.md](DEVNET.md).", "",
          "## 실행 환경", "", "```text", (local / "environment.txt").read_text().strip(), "```", "",
          "proptest 1.6.0 (logic dev-dependency만 추가), 512표본 × 4속성. 나머지 기존 의존성 버전과 루트 Cargo.lock·yarn.lock은 유지했습니다.", "",
          "Core 0.15.3 SHA-256: `5b4dacdae4af476d3c9d8aa6712883f559ba0e13705f9b244d96d1fd0dd56ce5`.",
          *(["운영 SBF SHA-256: `" + (local / "production-binary.sha256").read_text().split()[0] + "`."] if production else []), ""]
(root / "docs/TEST_RESULTS.md").write_text("\n".join(lines), encoding="utf-8")
print(f"Report: {len(rule_names)} Rust + {len(prop_names)} proptest + {total} on-chain PASS")
