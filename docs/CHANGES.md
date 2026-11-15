# 변경 내역

## 2026-11-15 저장소 정리·검증 보강

- 저작권·LICENSE 작업은 사용자 요청으로 보류했습니다.
- 게임 코드의 참조가 없는 game/_backup 4개 파일을 git rm으로 제거하고 재추적을 막았습니다. 게임의 기존 미커밋 변경은 보존했습니다.
- 이미지 95개를 파일별로 조사했습니다. parts.png·rabbit-parts.png도 동적 갤러리에서 사용되어 보존했습니다. 미사용이 확정된 이미지가 없어 실제 제외는 0개이며, Pages 빌드 크기는 전후 모두 20,593,784B입니다. 정원·실험실·성향 트리의 로컬 HTTP/DOM 검사와 격리된 Edge headless 렌더링도 확인했습니다. 목록과 이유는 PAGES_ASSETS.md에 있습니다.
- 기존 Rust 21개 및 온체인 27개의 본문·기대값은 유지하고 후속 describe에서 독립 자식·지갑으로 S13~S21·R01~R02·C01~C03·O02~O03을 추가했습니다. 기존 상태를 쓰는 준비 작업은 27개 실행 뒤에 배치했습니다.
- R03·S16의 미초기화 상태와 S14 handler fixture는 같은 프로그램 ID의 독립 로컬 검증기에서 확인합니다. S14 정상 경로의 PDA 제약과 genesis 주입 검증을 구별해 기록했습니다.
- scripts/check-production.sh는 별도 캐시·산출물·ledger·RPC/gossip 포트를 사용합니다. local-testing 없는 빌드의 30일 설정·TooEarly를 확인했습니다.
- scripts/nonce-grind.cjs는 원래 도메인·부모 순서·u64 LE nonce 규칙을 그대로 사용합니다. 목표 nonce를 온체인에 적용하는 RISK 테스트를 추가했습니다. 비밀값 선청구와 초기화 선점도 성공을 assert합니다. 위험을 고치지 않고 README에 대응안을 기록했습니다.
- 고정 Core 0.15.3에서 burn 후 1B tombstone·남은 PetRecord, Freeze 선물 InvalidAuthority, 일반 위임 초기화와 이전 위임자의 NoApprovals를 실제 관찰했습니다. 플러그인 API 제약으로 생략한 항목은 없습니다.
- 성공 트랜잭션 10개 명령의 CU·수수료·신규 계정 최소 rent/실제 예치액을 수집하고 COSTS.md를 생성합니다. BirthEvent의 네 필드를 자식 PetRecord와 대조합니다.
- devnet은 별도 승인 가드가 있는 스크립트만 작성했습니다. 배포 키·잔액·Core 해시 확인이 필요하며, 기존 프로그램을 덮어쓰거나 에어드롭하지 않습니다. 실제 실행은 승인 대기 상태입니다.
- logic dev-dependency proptest =1.6.0과 4속성(각 512표본)을 추가하고 logic/Cargo.lock만 갱신했습니다. 기존 루트 잠금 파일과 SDK 버전은 유지했습니다.
- check.sh·report.py는 Rust 개별 시간과 실제 온체인/독립 운영 결과로 TEST_RESULTS.md를 생성합니다. 최종 검증은 Rust 21 + proptest 4 + 온체인 43 + 독립 운영 4 = 온체인 총 47 통과입니다.
- 컨트랙트 lib.rs·rules.rs, 계정 레이아웃·IDL 정의·프로그램 ID·seed·종 순서·운영 정책은 변경하지 않았습니다. 모든 새 커밋은 로컬에만 만들며 push하지 않습니다.

기존 소스가 없어 전체 파일을 신규 생성했습니다. 기존 계약의 패치나 보존을 주장하지 않습니다.

| 파일 | 이유 |
|---|---|
| programs/hatchmind/src/lib.rs | 초기 4종 등록, 단계 성장, 쌍방 동의·취소·교배, Core 소유자 재검증, Gift PDA 에스크로·청구·회수 |
| programs/hatchmind/src/rules.rs | SHA-256 seed, 단계 시간·TTL·쿨다운·상동기관 상속 규칙 |
| logic/src/lib.rs | rules.rs 직접 포함으로 두 구현의 규칙 불일치 제거 |
| logic/tests/rules_port.rs | 21개 순수 Rust 규칙 테스트 |
| tests/hatchmind.ts | SDK transferV1 실제 전송, 실패 S01~S12, 정상 교배·동일 지갑·만료·회수 검증 |
| Cargo.toml 및 프로그램 Cargo.toml | Anchor 0.30.1 및 mpl-core 0.8.1 선택 |
| Cargo.lock | Solana 1.18.26 통일, Anchor 하위 매크로·anchor-syn 0.30.1 고정 |
| package.json, yarn.lock | SDK 버전 고정, 중복 web3.js 타입 제거, @noble/hashes 피어 의존성 충족 |
| Anchor.toml | Localnet만 등록, 실제 Core 프로그램 genesis 로딩 |
| scripts/setup.sh | 공식 Core 바이너리 해시 검증, 비공개 로컬 지갑 생성 |
| scripts/env.sh | 기존 전역 도구 버전 선택을 바꾸지 않고 Anchor 0.30.1 직접 사용 |
| scripts/check.sh | 로컬 전체 검증과 로그 저장 |
| .gitignore | 모든 개인키·로컬 지갑·빌드·검증기 데이터 제외 |
| .vscode 및 code-workspace | VS Code 폴더·테스트 작업 구성 |
| README.md | 정책, 새로 정의한 실패 시나리오 ID, 실행 방법과 운영 위험 |
| docs/TEST_RESULTS.md | 실제 최종 실행 결과와 테스트별 결과 |

## 의존성 오류 수정 이유

첫 Cargo 해석에서 mpl-core 0.8.1의 넓은 solana-program 범위 때문에 2.3.0이 별도로 선택됐습니다. Anchor 0.30.1은 1.18.x의 AccountInfo·Pubkey를 사용하므로 잠금 파일에서 Solana 프로그램 크레이트를 1.18.26으로 통일했습니다.

또한 anchor-lang 0.30.1의 하위 버전 범위가 0.30.3 매크로를 선택하여 AnchorDeserialize 컴파일 오류를 일으켰습니다. Anchor 매크로 9종과 anchor-syn을 0.30.1로 맞췄습니다.

JS SDK들이 서로 다른 web3.js 복사본을 사용하면서 Transaction의 private 타입이 충돌했습니다. resolutions로 1.95.3에 통일했습니다. 검증을 약하게 하거나 실제 NFT 전송을 모의 객체로 바꾸지 않았습니다.

## 정책 관련 구현 선택

요청한 6개 정책은 그대로 구현했습니다. 원본 README가 없어 초기 단계(알), 쿨다운(stage_seconds), TTL 범위(1~86400초), 자식 최초 소유자(A), 종 인덱스 기반 최소 유전형은 이 테스트 버전에서 새로 명시했습니다. 운영 정책을 확정한 구현으로 해석하지 마세요.

## 추가 빌드·테스트 호환성 수정

- vendor/anchor-syn: 최신 proc-macro2에서 제거된 source_file API를 local_file로 교체하는 IDL 한 줄 패치. 원본과 비교하여 다른 소스 파일은 변경하지 않았습니다.
- lib.rs: Metaplex Key를 CoreKey 별칭으로 가져와 Anchor Key 트레이트 이름 충돌 해결. 큰 상태 계정을 Box로 보관하여 SBF 4KB 스택 초과 해결. 계정 데이터 형식과 검증은 유지했습니다.
- tests/hatchmind.ts: 생성된 IDL 타입을 사용하고 accountsStrict로 명시적 계정을 전달합니다. 타입 검사를 끄지 않았습니다.
- Node 24가 TypeScript를 ESM으로 직접 읽으면 Anchor BN getter를 찾지 못했습니다. ts-node CommonJS 로더를 명시해 해결했습니다.
- Anchor 기본 processed와 Umi 기본 finalized가 섞여 새 NFT를 못 읽는 테스트 오류가 있었습니다. 양쪽을 confirmed로 통일하여 생성·전송 확인 후 같은 확정 수준으로 조회하도록 고쳤습니다.
- scripts/env.sh: 고빈도 컴파일 캐시를 WSL Linux 디스크로 옮겼습니다. 최종 SBF 산출물은 프로젝트 target/deploy에 유지합니다.
- Cargo.toml: libsecp256k1 호스트 빌드 최적화는 컴파일 시간만 줄이며 컨트랙트 정책과 무관합니다.
- 남은 빌드 경고는 구형 Anchor의 unexpected cfg 및 vendored 소스의 lifetime 표기 경고입니다. 스택 한도 초과 경고는 해결했으며 check.sh에서 다시 발생하면 실패 처리합니다.
