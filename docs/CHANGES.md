# 변경 내역

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
