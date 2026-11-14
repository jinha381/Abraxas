# HatchMind — 로컬 컨트랙트 테스트 버전

이 저장소는 제공된 정책으로 새로 작성한 해커톤용 구현입니다. 이전 컨트랙트 원본은 제공되지 않았습니다. 기존 저장소를 복구하거나 기존 21개 테스트를 재실행한 결과로 표현하지 않습니다.

## 확인한 결과

순수 Rust 21개, 실제 Core 온체인 통합 27개가 모두 통과했습니다. Anchor 0.30.1의 SBF·IDL 빌드와 기본 30일 운영 설정의 별도 컴파일도 성공했습니다. 테스트별 결과는 [TEST_RESULTS.md](docs/TEST_RESULTS.md), 수정 이유는 [CHANGES.md](docs/CHANGES.md)에 기록합니다.

## 정책

1. 초기 지갑 역할은 dewey·axie·kitty·tama 순서이며 토끼(0)·거북(1)·기니피그(2)·족제비(3)를 각각 한 마리만 등록합니다. 지갑 공개키는 initialize에서 고정됩니다.
2. 같은 지갑에 속한 서로 다른 펫끼리 교배할 수 있습니다. 요청자의 서명 한 번이 두 소유권의 동의를 충족합니다. 동일한 펫의 자기 교배는 금지합니다.
3. 교배 seed는 SHA-256(`HM-BREED-v1` || 부모A Core asset 공개키 32바이트 || 부모B 32바이트 || 요청번호 u64 LE 8바이트)입니다. 부모 순서가 중요합니다.
4. 성장 단계는 알(0) → 아기(1) → 성장기(2) → 진화(3)입니다. 정확히 한 단계씩만 진행하며 매 단계 직전 변경 시각부터 stage_seconds를 기다립니다. 기본 운영 빌드는 30일, 명시적 local-testing 기능 빌드는 3초입니다.
5. 소유권은 저장된 PetRecord가 아니라 매번 실제 Core AssetV1에서 검증합니다. 교배 승인과 실행은 요청 때 동의한 두 지갑과 현재 Core 소유자를 대조합니다.
6. 알 선물은 실제 Core 소유권을 Gift PDA로 이동한 뒤 비밀값 SHA-256 해시를 확인하여 청구합니다. 만료 시 자동 반환하지 않으며 최초 선물자의 서명으로만 reclaim_gift가 가능합니다.

## 추가로 명시한 테스트 버전 규칙

- 초기 네 펫도 알(0)부터 시작합니다. 성장기 이상만 교배할 수 있습니다.
- 교배 쿨다운은 stage_seconds와 같습니다. 요청과 실행 양쪽에서 검사합니다.
- TTL은 호출자가 1~86400초로 정합니다. `now >= expires`이면 만료입니다.
- 자식은 요청 당시 부모 A 지갑 소유로 발행됩니다. 승인 완료 후 실행 트랜잭션 수수료는 제3자가 지불할 수 있습니다.
- 고정 유전형은 골격 + 귀·외피·꼬리·발·무늬·눈의 7개 종 인덱스입니다. 각 기관은 같은 위치의 부모 기관 중 하나를 물려받습니다. 색 혼합·기질 4축·경험 기반 진화 갈래·커넥톰 커밋은 이 로컬 계약의 범위에 포함되지 않습니다.
- 요청·선물의 사용 상태는 남겨 중복 실행을 차단합니다. 메타데이터 URI는 테스트용 example.invalid이며 실제 이미지 호스팅은 구현하지 않았습니다.

## 구조

- programs/hatchmind/src/lib.rs: Anchor 프로그램, 실제 Core CPI, 계보와 선물
- programs/hatchmind/src/rules.rs: 공통 순수 규칙
- logic/src/lib.rs: 위 rules.rs를 직접 포함하여 규칙 불일치를 원천 방지
- logic/tests/rules_port.rs: 21개 경계·상속·해시 테스트
- tests/hatchmind.ts: 실제 로컬 검증기 통합 테스트
- scripts/setup.sh: 의존성·Core 바이너리·로컬 지갑 준비
- scripts/check.sh: 규칙 테스트, keys sync, 빌드, 타입 검사, 온체인 테스트
- docs/TEST_RESULTS.md: 최종 실행 결과와 개별 테스트 목록
- .local/: Git에서 제외한 테스트 지갑과 로그
- vendor/mpl_core.so: 공식 Metaplex Core 프로그램 바이너리, Git에서 제외

## 함수

| 함수 | 역할 |
|---|---|
| initialize | 네 지갑과 단계 대기 시간을 최초 1회 고정 |
| register_pet | 지정 지갑에게 지정 종 Core NFT 1개 생성 |
| record_evolution | 현재 Core 소유자가 한 단계 성장 |
| request_breeding | 소유자 A 요청, 소유자와 만료 시각 기록 |
| approve_breeding | 현재 소유자 B가 서명하여 승인 |
| cancel_breeding | 동의 당사자 중 한 명이 취소 |
| execute_breeding | 동의·현재 소유자·단계·쿨다운 검사 후 알 발행 및 계보 기록 |
| create_gift_claim | 알을 Gift PDA에 에스크로 |
| claim_egg | 만료 전 비밀값으로 청구 |
| reclaim_gift | 만료 후 최초 선물자가 회수 |

## 실패 시나리오

아래 ID는 기존 README가 없는 상태에서 이 구현의 검증 항목으로 새로 정했습니다. 아래 항목은 모두 통과했으며, 테스트별 결과는 docs/TEST_RESULTS.md에 기록합니다.

| ID | 실패 조건 | 기대 오류 | 검증 |
|---|---|---|---|
| S01 | 현재 소유자·동의 당사자가 아닌 지갑의 요청/승인/성장/선물/회수 | Unauthorized | PASS · 온체인 |
| S02 | B 동의 없이 실행 | MissingConsent | PASS · 온체인 |
| S03 | 동일 펫을 양쪽 부모로 사용 | SamePet | PASS · 온체인 |
| S04 | 요청·승인 후 A 또는 B의 Core 소유자 변경 | OwnerChanged | PASS · 실제 transferV1 |
| S05 | 실행한 요청으로 두 번째 알 발행 | AlreadyConsumed | PASS · 온체인 |
| S06 | 성장 건너뛰기·되돌리기·최종 단계 초과·미성숙 교배 | InvalidStage | PASS · 온체인 + Rust |
| S07 | 단계별 대기 시간 미충족 | TooEarly | PASS · 동일 트랜잭션 + Rust |
| S08 | 잘못된 선물 비밀값 | BadSecret | PASS · 온체인 |
| S09 | 이미 청구·회수한 선물 링크 재사용 | AlreadyClaimed | PASS · 온체인 |
| S10 | 만료 전 선물 회수 | NotExpired | PASS · 온체인 |
| S11 | 취소된 교배 요청 실행 | Cancelled | PASS · 온체인 |
| S12 | 교배 쿨다운 중 요청 또는 실행 | Cooldown | PASS · 동일 트랜잭션 + Rust |
| E01 | 만료된 교배 요청 승인/실행 | Expired | PASS · 온체인 시각 대기 |
| E02 | 만료된 선물 청구 | Expired | PASS · 온체인 시각 대기 |
| E03 | 만료 후 선물자 회수 | 성공, Core 소유자 복원 | PASS · 온체인 |
| E04 | 0·음수·상한 초과 TTL | InvalidTtl | PASS · 온체인 + Rust |
| E05 | 초기 종 중복 발행 | AlreadyRegistered | PASS · 온체인 |

## 실행 — Windows + WSL Ubuntu

Windows 경로: `C:\Users\이수민\hatchmind`
WSL 경로: `/mnt/c/Users/이수민/hatchmind`

```bash
cd /mnt/c/Users/이수민/hatchmind
bash scripts/setup.sh
bash scripts/check.sh
```

스크립트는 WSL의 기존 Rust·Solana·nvm을 사용하고 Anchor 0.30.1 직접 바이너리를 선택합니다. 기본 RPC는 Localnet입니다. 통합 테스트는 localhost 이외 RPC에서 즉시 중단합니다. devnet 배포 명령은 포함하지 않습니다.

개별 실행:

```bash
source scripts/env.sh
(cd logic && cargo test --locked)
"$ANCHOR_BIN" keys sync
"$ANCHOR_BIN" build -- --features local-testing --sbf-out-dir "$PWD/target/deploy"
yarn typecheck
"$ANCHOR_BIN" test --skip-build
```

운영 시간 설정의 컴파일 확인은 `"$ANCHOR_BIN" build`로 실행합니다. 그 결과물은 30일 단계 시간을 사용하므로 3초 통합 테스트에 사용하지 마세요.

## 의존성

- Anchor CLI / anchor-lang / TypeScript SDK: 0.30.1
- mpl-core Rust: 0.8.1. 최신 Rust SDK는 Anchor 0.30.1과 다른 Solana 타입을 사용하므로 이 버전을 선택했습니다.
- mpl-core 0.8.1의 `solana-program >1.14`가 별도 Solana 2.x를 고르지 않도록 Cargo.lock의 Solana 프로그램 그래프를 1.18.26으로 통일했습니다.
- Metaplex Core JS: 1.1.0, Umi: 0.9.2
- 로컬 실행 Solana CLI/validator: 3.1.10
- Core 실제 프로그램: 공식 core@0.15.3 릴리스. SHA-256은 setup.sh에 고정되어 있습니다. Rust SDK/JS SDK와 실제 프로그램의 버전은 별도이며 CreateV1·TransferV1 프로토콜의 호환성을 통합 테스트로 확인합니다.
- anchor-syn 0.30.1은 vendor/anchor-syn에 포함했습니다. 최신 proc-macro2에서 사라진 source_file().path()를 local_file()로 바꾸는 IDL 생성 한 줄 패치입니다. PATCH.md와 원본 라이선스를 함께 보관합니다.
- Node 24의 네이티브 TypeScript 로더 대신 ts-node의 CommonJS 로더를 명시합니다. Anchor와 Umi의 확정 수준은 confirmed로 통일합니다.
- CARGO_TARGET_DIR은 WSL의 ~/.cache/hatchmind-target입니다. Windows 디스크의 대량 빌드 파일 쓰기를 피하고 최종 바이너리는 프로젝트 target/deploy에 저장합니다.
- Cargo.lock, logic/Cargo.lock, yarn.lock을 커밋하여 재현합니다.

## 운영 전 보강

- initialize는 아직 배포자 공개키를 프로그램에 고정하지 않았습니다. 업그레이드 권한자에 의한 초기화 인증 또는 배포·초기화 원자화를 검토해야 합니다.
- 선물 링크는 비밀값 소지자에게 권리를 주는 bearer 방식입니다. 공개 트랜잭션의 비밀값을 다른 지갑이 먼저 사용하는 경쟁을 막으려면 수신 지갑 결합 또는 별도 청구 프로토콜이 필요합니다.
- 공개 요청번호 기반 seed는 결정적이며 예측 가능합니다. 희귀도 경제에 쓰기 전 검증 가능한 난수 정책을 별도로 설계해야 합니다.
- 요청·선물 상태 계정은 중복 방지를 위해 닫지 않습니다. 운영 시 임대료·정리·장기 재사용 정책이 필요합니다.
- 외부 검토 및 독립 보안 감사는 수행하지 않았습니다. Core 플러그인 조합, 업그레이드, UI 지갑 승인, 장애 복구와 부하 테스트가 추가로 필요합니다.

## VS Code와 Git

hatchmind.code-workspace를 열면 됩니다. 작업 실행 메뉴에서 HatchMind: all local checks (WSL)를 선택하면 전체 검증을 실행합니다. Git 저장소는 https://github.com/jinha381/Abraxas에 연결되어 있으며 main 브랜치로 관리합니다.

개인키는 .local과 target 안에만 생성되며 Git에서 제외됩니다. 테스트의 네 역할 지갑은 매 실행마다 메모리에서 새로 생성됩니다.
