# HatchMind — 로컬 컨트랙트 테스트 버전

이 저장소는 제공된 정책으로 새로 작성한 해커톤용 구현입니다. 이전 컨트랙트 원본은 제공되지 않았습니다. 기존 저장소를 복구하거나 기존 21개 테스트를 재실행한 결과로 표현하지 않습니다.

## 확인한 결과

순수 Rust 기존 21개와 proptest 4개(각 512표본), 실제 Core 온체인 총 47개가 통과했습니다. 온체인은 3초 설정 43개(기존 27 + 추가 16개)와 독립 30일 운영 빌드 4개입니다. Anchor 0.30.1 SBF·IDL 빌드와 타입 검사도 성공했습니다. R01~R03의 통과는 **현재 허용되는 위험의 성공 재현**이며 해결을 뜻하지 않습니다. 테스트별 시간과 관찰은 [TEST_RESULTS.md](docs/TEST_RESULTS.md), 비용은 [COSTS.md](docs/COSTS.md), 변경은 [CHANGES.md](docs/CHANGES.md)에 기록합니다.

## 정책

1. 초기 계정은 user1·user2·user3·user4 순서이며 각각 토끼 듀이(0)·거북 셸리(1)·기니피그 피치(2)·족제비 액시(3)를 한 마리씩 등록합니다. 계정 이름과 펫 이름은 분리됩니다.
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
- logic/tests/properties.rs: proptest 4속성, 각 512표본
- tests/hatchmind.ts: 실제 로컬 검증기 통합 테스트
- validation/production.ts: 독립 검증기의 30일 설정·비Core fixture·초기화 검증
- validation/devnet-smoke.ts: 기본 테스트에서 제외한 devnet 승인 후 실행용 흐름
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

기존 S01~S12·E01~E05 검증에 실패·위험·Core 경계 상황을 추가했습니다. PASS는 기대한 방어 또는 정상 동작, RISK 재현은 공격 성공, 관찰은 고정 Core 바이너리의 실제 동작을 뜻합니다. 테스트별 결과는 docs/TEST_RESULTS.md에 기록합니다.

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
| S13 | child_owner를 실행자·제3자 지갑으로 바꿈 | Unauthorized | PASS · 부모/요청 불변, 자식·PetRecord 미생성 |
| S14 | System/다른 프로그램 소유 계정을 성장·교배 양쪽 자산에 전달 | InvalidCoreAsset | PASS · 정상 상태는 ConstraintSeeds 선행; 독립 genesis fixture로 handler InvalidCoreAsset·롤백 확인 |
| S15 | 다른 펫의 PetRecord를 pet_a로 전달 | seeds/constraint 오류 | PASS · ConstraintSeeds, 요청 미생성 |
| S16 | initialize 재호출, 0·중복 founders | 기존 계정 오류 / InvalidFounder | PASS · 재호출 시 config 불변; 독립 검증기에서 서명 검증 포함 simulate로 두 InvalidFounder 확인 |
| S17 | 비founder 등록 / species>=4 | Unauthorized / InvalidFounder | PASS · 등록·자산 미생성, config 불변 |
| S18 | 같은 부모·nonce 재요청 | 기존 계정 오류 | PASS · already in use, 기존 요청 불변 |
| S19 | 취소 후 승인 / 소비 후 취소 / A가 B 대신 승인 | Cancelled / AlreadyConsumed / Unauthorized | PASS · 요청 상태 불변 |
| S20 | 1단계 이상 선물 / 전부 0인 해시 | InvalidStage / BadSecret | PASS · 소유권 불변, Gift PDA 미생성 |
| S21 | 동의된 요청을 제3자 payer가 실행 | 성공, 자식 소유자 owner_a | PASS · 실제 Core 소유권·consumed 확인 |
| R01 | 공개 부모 정보로 목표 유전체 nonce 선택 | 공격 성공 재현 | RISK 재현 · 고른 nonce로 실제 목표 자식 발행 |
| R02 | 비밀값을 아는 제3자가 선물을 먼저 청구 | 공격 성공 재현 | RISK 재현 · 제3자 소유권 획득, 이후 청구 AlreadyClaimed |
| R03 | 배포 키와 무관한 제3자의 최초 initialize | 공격 성공 재현 | RISK 재현 · 독립 검증기에서 authority·founders 선점 |
| C01 | 부모 burn 후 교배 요청·기승인 요청 실행 | InvalidCoreAsset | PASS · 자식 미생성, PetRecord 유지; 1B Core tombstone 관찰 |
| C02 | FreezeDelegate(frozen=true) 알의 선물 생성 | 결과 관찰 | 관찰 · Core InvalidAuthority(9), 전체 롤백·소유자 유지 |
| C03 | 선물 전 Transfer/BurnDelegate를 다른 키로 위임 후 청구 | 잔존·공격 결과 관찰 | 관찰 · 두 authority가 Owner로 초기화, 이전 위임자의 transfer/burn 모두 NoApprovals(26) |
| O01 | local-testing 없는 별도 로컬 운영 빌드 | 2592000초 / 즉시 성장 TooEarly | PASS · 독립 산출물·검증기에서 확인 |
| O02 | 명령 10개의 CU·생성 계정 rent | 실제 트랜잭션 측정 | PASS · [비용 표](docs/COSTS.md) |
| O03 | BirthEvent와 자식 PetRecord 대조 | child·parents·seed 일치 | PASS · 실제 성공 로그 파싱 |
| O04 | 별도 devnet 스모크 | 승인 후 배포→청구 | 미실행 · [실행 조건·스크립트](docs/DEVNET.md), 사용자 승인 대기 |

S14 fixture는 유효한 PDA·직렬화된 PetRecord와 비Core 자산의 조합을 로컬 genesis에만 주입합니다. 이 조합을 공격자가 정상 등록 경로에서 만들 수 있다고 주장하지 않습니다. S16은 이미 있는 config를 simulate로 지울 수 없으므로 미초기화 독립 검증기를 사용합니다. [simulateTransaction](https://solana.com/docs/rpc/http/simulatetransaction)은 현재 체인 상태를 사용합니다.

## 실행 — Windows + WSL Ubuntu

Windows 경로: `C:\Users\이수민\hatchmind`
WSL 경로: `/mnt/c/Users/이수민/hatchmind`

```bash
cd /mnt/c/Users/이수민/hatchmind
bash scripts/setup.sh
bash scripts/check.sh
```

스크립트는 WSL의 기존 Rust·Solana·nvm을 사용하고 Anchor 0.30.1 직접 바이너리를 선택합니다. 기본 RPC는 Localnet입니다. 기존 통합 테스트의 localhost 검사는 유지합니다. devnet은 기본 검사에서 실행하지 않는 별도 승인 스크립트만 준비했습니다.

개별 실행:

```bash
source scripts/env.sh
(cd logic && cargo test --locked)
"$ANCHOR_BIN" keys sync
"$ANCHOR_BIN" build -- --features local-testing --sbf-out-dir "$PWD/target/deploy"
yarn typecheck
"$ANCHOR_BIN" test --skip-build
```

운영 설정은 `bash scripts/check-production.sh`로 검증합니다. local-testing 없이 Anchor build를 실행해 `.local/production/deploy`에 저장하고, 전용 포트 18999·별도 ledger·캐시를 사용합니다. 초기화 후 stage_seconds=2592000과 즉시 성장 TooEarly를 검사합니다. `bash scripts/check.sh`는 다시 3초 산출물을 target/deploy에 빌드합니다. 보고서를 모두 포함하려면 운영 검증 후 check.sh를 실행합니다.

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
- logic 테스트 dev-dependency에만 proptest `=1.6.0`을 추가했습니다. 나머지 기존 의존성과 루트 Cargo.lock·yarn.lock은 변경하지 않았습니다.

## 운영 전 보강

- **R01 현재 허용됨(위험): nonce 고르기.** 목표 유전체를 만드는 nonce를 찾고 실제 교배 결과가 일치함을 assert했습니다. `rules::inherit`는 seed 앞 7바이트 각각의 최하위 1비트만 사용하므로, 부모가 7자리 모두 다를 때 최대 128가지 결과입니다(같은 자리는 경우의 수 감소). `node scripts/nonce-grind.cjs A공개키 B공개키 A유전체csv B유전체csv 목표csv`로 시도 수·시간을 출력합니다. 도메인을 포함한 기존 SHA-256 seed 규칙은 유지했습니다. 대응안은 B가 제공하는 예측 불가한 값을 승인에 결합하기, 신뢰·편향 가능성을 검토한 최근 slot hash 결합, 커밋–리빌/검증 가능한 난수 도입입니다.
- **R02 현재 허용됨(위험): 선물 비밀값 가로채기.** 수신자가 고정되지 않아 비밀값을 아는 제3자가 먼저 청구해 Core 소유권을 획득했습니다. 뒤늦은 의도된 수신자는 AlreadyClaimed로 실패합니다. 이는 비밀값을 미리 아는 공격의 재현이며 실제 네트워크 전파 경쟁의 측정은 아닙니다. 대응안은 수신 지갑을 해시에 결합하고 청구 서명자와 대조하거나 별도 청구 프로토콜을 설계하는 것입니다.
- **R03 현재 허용됨(위험): 초기화 선점.** [initialize](programs/hatchmind/src/lib.rs#L13)는 founders 유효성만 확인하고 호출자 제한은 없습니다. [Initialize](programs/hatchmind/src/lib.rs#L358)의 authority는 일반 Signer입니다. 독립 검증기에서 배포 키와 다른 제3자가 최초 호출해 authority와 founders를 정하는 데 성공했습니다. 대응안은 upgrade authority 또는 고정 관리자만 허용하고 배포 직후 초기화를 보장하는 것입니다.
- **Core 관찰:** burn 뒤 PetRecord가 남아도 자산 검사로 재교배는 차단됩니다. 죽은 기록·남은 예치액 정리 정책은 별도로 필요합니다. Freeze 선물 실패는 UI에서 사전 안내할 필요가 있습니다. 일반 Transfer/BurnDelegate는 이번 전송에서 초기화되어 이전 위임 공격이 실패했습니다. 이 결과를 Permanent 계열이나 모든 플러그인 조합의 안전성으로 확장하지 않습니다. [공식 위임 설명](https://www.metaplex.com/docs/smart-contracts/core/plugins/delegating-and-revoking-plugins), [burn 설명](https://www.metaplex.com/docs/smart-contracts/core/burn)과 고정 0.15.3 실측을 구분합니다.
- 요청·선물 상태 계정은 중복 방지를 위해 닫지 않습니다. 운영 시 임대료·정리·장기 재사용 정책이 필요합니다.
- 외부 검토 및 독립 보안 감사는 수행하지 않았습니다. Core 플러그인 조합, 업그레이드, UI 지갑 승인, 장애 복구와 부하 테스트가 추가로 필요합니다.

## VS Code와 Git

hatchmind.code-workspace를 열면 됩니다. 작업 실행 메뉴에서 HatchMind: all local checks (WSL)를 선택하면 전체 검증을 실행합니다. Git 저장소는 https://github.com/jinha381/Abraxas에 연결되어 있으며 main 브랜치로 관리합니다.

개인키는 .local과 target 안에만 생성되며 Git에서 제외됩니다. 테스트의 네 역할 지갑은 매 실행마다 메모리에서 새로 생성됩니다.

## 게임 화면 HTML

[game/index.html](game/index.html)을 브라우저에서 직접 열면 그래픽 원본 9개를 사용한 작은 숲 화면을 체험할 수 있습니다. 실행 방법과 구현 범위는 [game/README.md](game/README.md)에 정리했습니다. Node가 있으면 프로젝트 루트에서 `node game/server.cjs`로 로컬 미리보기를 실행할 수도 있습니다.

브라우저 안의 화면 체험이며, 실제 지갑 서명이나 온체인 거래는 연결하지 않았습니다.

## 공개 게임 링크

[HatchMind 플레이하기](https://jinha381.github.io/Abraxas/) — 휴대폰과 PC 브라우저에서 설치·로그인 없이 플레이합니다. 온체인 연결과 유저 간 통신 없이 각자 기기에 진행 상황을 저장합니다. game/ 수정분을 main에 푸시하면 GitHub Pages가 자동 갱신됩니다.

## NeuroVision 자료와 NeuroProof(확장)

[docs/neurovision/](docs/neurovision/)에 뇌공학 담당(이윤지)이 만든 자료를 둡니다.

- `HatchMind_NeuroVision_8s.webm`: FlyWire FAFB v783의 PN·KC SWC 형태 데이터로 그린 8초 시연 영상. 뉴런 형태는 실제 데이터이고, 빛·색의 이동은 학습 회로를 설명하는 교육용 연출입니다(실측 활성도 지도 아님).
- `HatchMind_NeuroVision_해설.pdf`: 영상 해설과 NeuroProof·NeuroGenome 설계안.
- `HatchMind_뇌구조_게임반응_설계.pdf`: 게임 행동별 관련 회로, 향기–보상 기억, 가상 회로 개입 실험 설계.

NeuroProof는 펫의 경험과 가상 신경 회로 상태 변화를 SHA-256 해시 사슬로 고정해 펫 NFT와 연결하는 확장 설계입니다. 현재는 게임 안의 로컬 해시 사슬(경험 지문)만 구현했으며, 온체인 PDA 기록은 하지 않습니다. 형식은 [game/README.md](game/README.md#경험-지문-neuroproof-로컬-미리보기)에 있습니다.

## 참고문헌

기획서 본문의 대괄호 번호는 아래 목록을 가리킵니다.

1. S. Dorkenwald et al., "Neuronal wiring diagram of an adult brain," Nature, 2024. https://www.nature.com/articles/s41586-024-07558-y
2. FlyWire Codex FAFB v783 데이터셋. https://codex.flywire.ai/
3. P. K. Shiu et al., "A Drosophila computational brain model reveals sensorimotor processing," Nature, 2024. https://www.nature.com/articles/s41586-024-07763-9
4. T. Springer, M. Nawrot, "A mechanistic model for reward prediction and extinction learning," 2021. https://pubmed.ncbi.nlm.nih.gov/33785523/
5. "Beyond prediction error: mushroom body learning models," 2024. https://pmc.ncbi.nlm.nih.gov/articles/PMC11199945/
6. J. Felsenberg et al., "Re-evaluation of learned information in Drosophila," Nature, 2017. https://www.nature.com/articles/nature21716
7. M. J. Krashes et al., "A neural circuit mechanism integrating motivational state with memory expression," Cell, 2009. https://pubmed.ncbi.nlm.nih.gov/19837040/
8. "Deprivation state-specific expression of memories in Drosophila," 2019. https://pubmed.ncbi.nlm.nih.gov/31659341/
9. D. L. Schacter, D. R. Addis, "Constructive memory and imagining the future," 2007. https://pubmed.ncbi.nlm.nih.gov/17395575/
10. S. S. Kim et al., "Ring attractor dynamics in the Drosophila central brain," Science, 2017. https://pubmed.ncbi.nlm.nih.gov/28473639/
11. Pr1nted, Open Fly: simulated FlyWire brain plays a strategy game, 2026. https://pr1nted.itch.io/open-fly
12. FlyWire Citation & Release Guidelines (CC BY-NC 4.0). https://home.flywire.ai/guidelines
13. J. M. Donlea, "Sleep and memory consolidation in insects," 2025. https://pubmed.ncbi.nlm.nih.gov/40975663/
14. 팀 아프락사스, HatchMind 소스 저장소(컨트랙트·테스트·게임). https://github.com/jinha381/Abraxas
15. 팀 아프락사스, HatchMind 플레이 링크(GitHub Pages). https://jinha381.github.io/Abraxas/
16. 팀 아프락사스, 최종 로컬 테스트 결과. [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md)
17. Metaplex Core / Solana PDA / Anchor 공식 문서. https://www.metaplex.com/docs/smart-contracts/core
18. P. Schlegel et al., "Whole-brain annotation and multi-connectome cell typing of Drosophila," Nature, 2024. https://www.nature.com/articles/s41586-024-07686-5
