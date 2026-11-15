#!/usr/bin/env python3
"""이미 빌드된 동일 Rust 테스트 바이너리에서 libtest 개별 실행 시간을 수집합니다."""
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent.parent
build = subprocess.run(["cargo", "test", "--locked", "--no-run", "--message-format=json"], cwd=root / "logic", check=True, capture_output=True, text=True)
artifacts = [json.loads(line) for line in build.stdout.splitlines() if line.startswith("{")]
binaries = sorted({a["executable"] for a in artifacts if a.get("reason") == "compiler-artifact" and a.get("profile", {}).get("test") and a.get("executable")})
assert binaries, "테스트 바이너리가 없습니다"
events = []
for binary in binaries:
    # 이 환경 변수는 이미 컴파일된 테스트 실행기에만 적용하며 빌드에는 적용하지 않습니다.
    run = subprocess.run([binary, "-Z", "unstable-options", "--format", "json", "--report-time"], env={**os.environ, "RUSTC_BOOTSTRAP": "1"}, check=True, capture_output=True, text=True)
    events.extend(json.loads(line) for line in run.stdout.splitlines() if line.startswith("{"))
results = [e for e in events if e.get("type") == "test" and e.get("event") in ("ok", "failed", "ignored")]
assert len(results) >= 25 and all(e["event"] == "ok" for e in results)
(root / ".local/rust-timing.jsonl").write_text("\n".join(json.dumps(e) for e in events) + "\n", encoding="utf-8")
print(f"Rust individual timing: {len(results)} PASS")
