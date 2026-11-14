#!/usr/bin/env python3
"""Generate a reviewable report only from successful local check artifacts."""
import argparse, json, re
from pathlib import Path
root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--rust-timing-log", type=Path)
parser.add_argument("--production-build-log", type=Path)
args = parser.parse_args()
data = json.loads((root / ".local/onchain-results.json").read_text())
logic_log = (root / ".local/logic-test.log").read_text()
rust_names = re.findall(r"^test (\S+) \.\.\. ok$", logic_log, re.M)
assert len(rust_names) == 21, f"Expected 21 Rust tests, got {len(rust_names)}"
assert data["stats"]["failures"] == 0 and data["stats"]["pending"] == 0
assert len(data["tests"]) == 27 and data["stats"]["passes"] == 27 and all(t["status"] == "PASS" for t in data["tests"])
rust_times = {}
if args.rust_timing_log:
    events = [json.loads(line) for line in args.rust_timing_log.read_text().splitlines() if line.startswith("{")]
    results = [e for e in events if e.get("type") == "test" and e.get("event") in ("ok", "failed", "ignored")]
    assert len(results) == 21 and all(e["event"] == "ok" for e in results)
    assert {e["name"] for e in results} == set(rust_names)
    rust_times = {e["name"]: f"{e['exec_time'] * 1000:.6f}" for e in results}
if args.production_build_log:
    production_log = args.production_build_log.read_text()
    assert "Finished" in production_log and "Stack offset" not in production_log
build_log = (root / ".local/anchor-build.log").read_text()
assert "Stack offset" not in build_log, "SBF stack warning must be fixed"
assert "Finished" in build_log
lines = [
"# 최종 로컬 테스트 결과", "",
"이 프로젝트는 기존 소스가 없는 상태에서 요청 정책으로 새로 작성했습니다.",
"기존 21개 테스트의 복원이 아니라, 공통 규칙 소스에 대한 신규 21개 테스트와 실제 Core 프로그램 통합 테스트 결과입니다.", "",
f"- 실행 시각(UTC): {data['date']}",
f"- 순수 Rust: {len(rust_names)} 통과 / 0 실패",
f"- 온체인 통합: {len(data['tests'])} 통과 / 0 실패 / 0 보류",
"- Anchor 0.30.1 SBF + IDL 빌드: 성공",
*(["- 기본 운영 설정(30일) 빌드: 성공 (컴파일만 확인)"] if args.production_build_log else []),
"- TypeScript 타입 검사: 성공",
"- 네트워크: 로컬 검증기만 사용, devnet 배포 없음", "",
"## 실행 명령", "", "```bash", "bash scripts/check.sh",
*(["source scripts/env.sh", '"$ANCHOR_BIN" build'] if args.production_build_log else []), "```", "",
"기존 의존성을 사용했으며 Core 0.15.3 바이너리 SHA-256을 확인했으므로 setup.sh는 다시 실행하지 않았습니다.", "",
*(["추가 시간 기록과 운영 빌드 로그를 포함한 보고서 생성 명령:", "", "```bash", f"python3 scripts/report.py --rust-timing-log {args.rust_timing_log} --production-build-log {args.production_build_log}", "```", ""] if args.rust_timing_log and args.production_build_log else []),
"check.sh는 cargo test --locked → anchor keys sync → anchor build(local-testing) → yarn typecheck → anchor test --skip-build를 순서대로 실행하며 실패 시 중단합니다.",
"실제 Core 바이너리는 해시를 검증하여 로컬 genesis에 로드합니다. 소유권 이전은 SDK transferV1과 온체인 CPI를 사용합니다.", "",
"## Rust 테스트별 결과", "",
*(["개별 시간은 check.sh가 빌드한 동일 테스트 바이너리를 libtest JSON 시간 기록으로 추가 실행하여 측정했습니다. RUSTC_BOOTSTRAP=1은 이 바이너리의 -Z unstable-options --format json --report-time 옵션에만 적용했으며 컴파일러·의존성은 변경하지 않았습니다.", ""] if rust_times else []),
"| 테스트 | 결과 | 시간(ms) |", "|---|---|---:|",
]
lines += [f"| {n} | PASS | {rust_times.get(n, '미측정')} |" for n in rust_names]
lines += ["", "## 온체인 테스트별 결과", "", "| 테스트 | 결과 | 시간(ms) |", "|---|---|---:|"]
lines += [f"| {t['name'].replace('|', '/')} | {t['status']} | {t.get('duration_ms', '')} |" for t in data["tests"]]
lines += ["", "## 검증 해석", "",
"- 실패 시나리오는 트랜잭션이 기대한 정확한 HatchMind 오류를 내는지 확인합니다. 다른 계정 제약 오류나 CPI 오류를 성공으로 인정하지 않습니다.",
"- 소유자 변경 검증은 A와 B 양쪽을 실제 전송하여 확인합니다.",
"- 같은 지갑 교배는 기니피그(피치)를 user3 → user1로 실제 전송한 후 user1의 요청만으로 알을 발행합니다.",
"- 만료된 요청과 선물은 온체인 Clock 시각을 기다립니다. 만료 후 원래 선물자만 회수하는지 실제 Core 소유자로 확인합니다.",
"- 너무 빠른 성장과 쿨다운은 동일 트랜잭션에서 검사하여 시간 경합을 피하며, 실패한 트랜잭션의 상태 롤백도 확인합니다.",
"- 변경 파일과 호환성 수정은 CHANGES.md, 운영 전 보강점은 README.md를 참고하세요.", "",
"## 실행 환경", "", "```text",
(root / ".local/environment.txt").read_text().strip(), "```", "",
"Core 바이너리: 0.15.3, SHA-256: `5b4dacdae4af476d3c9d8aa6712883f559ba0e13705f9b244d96d1fd0dd56ce5`.", "",
]
(root / "docs/TEST_RESULTS.md").write_text("\n".join(lines), encoding="utf-8")
print(f"Report: {len(rust_names)} Rust + {len(data['tests'])} on-chain PASS")
