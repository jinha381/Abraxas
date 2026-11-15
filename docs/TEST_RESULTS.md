# 최종 로컬 테스트 결과

- 3초 local-testing 실행 종료(UTC): 2026-11-15T07:58:50.875Z
- 순수 Rust: 21 통과 / 0 실패 / 0 보류 (기존 21개 유지)
- proptest: 4 통과 / 0 실패 / 0 보류, 각 512표본 (총 2048표본)
- 온체인: 총 47 통과 / 0 실패 / 0 보류. 3초 설정 43개(기존 27 + 추가 16개), 독립 운영 설정 4개.
- Anchor 0.30.1 SBF·IDL 빌드 및 TypeScript 타입 검사: 성공
- 운영 빌드 실행 종료(UTC): 2026-11-15T07:48:56.483Z
- local-testing 없는 별도 산출물을 독립 로컬 검증기에 로드: stage_seconds=2592000, 즉시 성장 TooEarly.
- 네트워크: localhost만 실행. devnet·mainnet 배포/에어드롭 없음.
- RISK 테스트의 PASS는 **현재 허용되는 공격의 성공 재현**을 뜻합니다. 취약점이 수정되었다는 의미가 아닙니다.

## 재현 명령

```bash
bash scripts/check-production.sh
bash scripts/check.sh
```

check.sh: cargo test --locked → 개별 Rust 시간 수집 → keys sync → 3초 SBF·IDL 빌드 → 타입 검사 → 온체인 테스트 → 비용·결과 문서 생성. 단계가 실패하면 중단합니다.
운영 검증기는 별도 포트·ledger·컴파일 캐시·산출물 경로를 사용합니다. 기존 config가 없는 동일 프로그램 ID 인스턴스이며, 프로그램 소스나 계정 레이아웃을 바꾸지 않습니다.

## Rust 테스트별 결과

시간은 동일하게 빌드된 테스트 바이너리를 libtest JSON으로 추가 실행해 측정했습니다. RUSTC_BOOTSTRAP=1은 테스트 실행기의 시간 출력 옵션에만 적용하며 컴파일에는 적용하지 않습니다. 0에 가까운 수치는 단일 테스트의 실측 시간이며 벤치마크는 아닙니다.

| 테스트 | 구분 | 결과 | 시간(ms) |
|---|---|---|---:|
| prop_next_stage | proptest 512표본 | PASS | 17.841231 |
| prop_deadline | proptest 512표본 | PASS | 19.900411 |
| prop_inherit | proptest 512표본 | PASS | 36.353830 |
| prop_breed_seed_adjacent_nonce | proptest 512표본 | PASS | 47.235787 |
| baby_to_growth | 기존 규칙 | PASS | 0.002024 |
| cannot_repeat | 기존 규칙 | PASS | 0.001062 |
| cannot_reverse | 기존 규칙 | PASS | 0.000531 |
| cannot_skip | 기존 규칙 | PASS | 0.000912 |
| cooldown_boundary | 기존 규칙 | PASS | 0.001603 |
| deadline_adds_ttl | 기존 규칙 | PASS | 0.001533 |
| deadline_rejects_zero_negative_or_large | 기존 규칙 | PASS | 0.001944 |
| deadline_overflow_rejected | 기존 규칙 | PASS | 0.000992 |
| egg_to_baby | 기존 규칙 | PASS | 0.000511 |
| eggs_and_babies_cannot_breed | 기존 규칙 | PASS | 0.001944 |
| expiry_boundary_inclusive | 기존 규칙 | PASS | 0.000601 |
| final_stage_terminal | 기존 규칙 | PASS | 0.000561 |
| growth_to_evolved | 기존 규칙 | PASS | 0.000381 |
| mature_pets_can_breed | 기존 규칙 | PASS | 0.001402 |
| negative_clock_delta_rejected | 기존 규칙 | PASS | 0.000711 |
| production_wait_30_days | 기존 규칙 | PASS | 0.000711 |
| seed_is_ordered_and_nonce_sensitive | 기존 규칙 | PASS | 0.076339 |
| wait_each_stage | 기존 규칙 | PASS | 0.000871 |
| seed_matches_exact_domain_and_little_endian | 기존 규칙 | PASS | 0.033836 |
| each_homologous_organ_comes_from_corresponding_parent | 기존 규칙 | PASS | 0.925712 |
| identical_parents_preserve_genotype | 기존 규칙 | PASS | 0.948457 |

## 3초 local-testing 온체인 테스트

| 테스트 | 결과 | 시간(ms) |
|---|---|---:|
| Genesis: user1/user2/user3/user4 receive rabbit(Dewey)/turtle(Shelly)/guinea-pig(Peachy)/weasel(Axy), one each | PASS | 1943 |
| Genesis: a fifth registration cannot duplicate a species | PASS | 64 |
| S01: a non-owner cannot evolve someone else's Core asset | PASS | 23 |
| S06: growth cannot skip a stage | PASS | 39 |
| S06: eggs cannot breed | PASS | 45 |
| Growth: all founders advance egg -> baby -> growth, waiting each stage | PASS | 8683 |
| S03: one asset cannot breed with itself | PASS | 23 |
| S01: only current owner A may create a request | PASS | 19 |
| S02: execute without owner B consent is rejected and leaves no egg | PASS | 433 |
| S01: a stranger cannot approve owner B's pet | PASS | 424 |
| S04: transfer pet A after both consent -> OwnerChanged | PASS | 1990 |
| S04: transfer pet B after consent -> OwnerChanged | PASS | 1709 |
| S11: cancelled breeding request cannot execute | PASS | 1421 |
| S01: stranger cannot cancel a breeding request | PASS | 506 |
| Expired: expired request rejects both approval and execution | PASS | 2863 |
| Invalid TTL: zero and negative request TTL are rejected | PASS | 55 |
| S12: cooldown rechecked at execution and new request; atomic rollback verified | PASS | 2291 |
| Normal breeding: two owners consent, exact SHA-256 seed and homologous inheritance recorded | PASS | 1666 |
| S05: replay cannot issue a second egg | PASS | 259 |
| Same-wallet breeding: transfer guinea pig (Peachy) user3 -> user1; user1 request alone suffices | PASS | 3992 |
| S07: next growth is too early within the same transaction | PASS | 63 |
| S08: wrong gift secret rejected; actual egg stays in Gift PDA | PASS | 800 |
| S09: gift link cannot be claimed twice | PASS | 946 |
| S10: giver cannot reclaim before expiry | PASS | 967 |
| S01: stranger cannot create a gift for another owner's egg | PASS | 73 |
| Expired gift: claim fails at expiry; only original giver reclaims; replay rejected | PASS | 3162 |
| Growth: current Core owner can evolve through final stage; reverse and further evolution rejected | PASS | 7543 |
| S13: child_owner를 실행자·제3자로 바꾸면 Unauthorized, 자식 미생성 | PASS | 988 |
| S14: 비Core 자산은 PDA 제약으로 선행 거절, handler는 독립 fixture에서 검증 | PASS | 221 |
| S15: 다른 PetRecord를 pet_a로 전달하면 ConstraintSeeds, 요청 미생성 | PASS | 49 |
| S16: initialize 재호출은 기존 계정 오류, config 불변 | PASS | 36 |
| S17: 비founder는 Unauthorized, species>=4는 InvalidFounder, 등록 미생성 | PASS | 108 |
| S18: 같은 부모·nonce 재요청은 기존 계정 오류, 요청 불변 | PASS | 434 |
| S19: 취소 후 승인 Cancelled, 실행 후 취소 AlreadyConsumed, A의 B 대신 승인 Unauthorized | PASS | 5719 |
| S20: 성장한 펫 선물 InvalidStage, 0 secret_hash BadSecret, 소유자 불변 | PASS | 5707 |
| S21: 제3자 payer로 실행 성공, 자식 소유자는 owner_a | PASS | 4118 |
| R01 RISK: 공개 seed로 nonce를 골라 목표 genome의 자식을 실제 발행 | PASS | 4112 |
| R02 RISK: 비밀값을 아는 제3자가 먼저 선물을 청구해 소유권 획득 | PASS | 5155 |
| C01: 부모 burn 뒤 요청·실행은 InvalidCoreAsset, PetRecord는 남음 | PASS | 16065 |
| C02: FreezeDelegate 알 선물의 실제 Core 결과와 롤백 관찰 | PASS | 2190 |
| C03: 선물 전 Transfer/BurnDelegate가 청구 후 남는지, 이전 위임 공격 관찰 | PASS | 9722 |
| O02: 명령 10개의 성공 트랜잭션 CU·신규 계정 rent를 실제 측정 | PASS | 25 |
| O03: BirthEvent child·parents·seed가 실제 자식 PetRecord와 일치 | PASS | 28 |

## 독립 30일 운영 빌드 온체인 테스트

| 테스트 | 결과 | 시간(ms) |
|---|---|---:|
| S16: 초기 config 없이 0·중복 founders를 simulate하면 InvalidFounder, 생성 없음 | PASS | 112 |
| R03 RISK: 배포 키와 무관한 제3자가 initialize를 선점해 authority가 됨 | PASS | 403 |
| O01: local-testing 없는 산출물은 2592000초, 등록 직후 성장은 TooEarly | PASS | 411 |
| S14: genesis fixture의 System/다른 프로그램 소유 asset은 handler에서 InvalidCoreAsset | PASS | 218 |

## 추가 검증·위험 관찰 원시 결과

S14는 정상 PetRecord와 다른 자산을 전달할 때 PDA 제약이 먼저 거절되는 경우와, genesis에만 주입 가능한 비Core/PetRecord 조합의 handler 검증을 구분합니다. 후자는 공격자가 실제로 만들 수 있는 상태라고 주장하지 않습니다.
S16의 0·중복 founders는 미초기화 검증기에 서명된 v0 트랜잭션을 simulateTransaction(sigVerify=true)하여 확인합니다. 기존 config가 있는 검증기의 재호출 실패로 대체하지 않았습니다.

### C01

```json
{
  "verdict": "PASS",
  "request": "InvalidCoreAsset",
  "execute": "InvalidCoreAsset",
  "record_survives": true,
  "tombstone_bytes": 1,
  "tombstone_lamports": 2397840,
  "tombstone_owner": "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d"
}
```

### C02

```json
{
  "verdict": "관찰",
  "gift_succeeded": false,
  "error": {
    "name": "InvalidAuthority",
    "code": 9,
    "message": "Invalid Authority\n\nSource: Program > mplCore [CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d]\n"
  },
  "state_unchanged": true
}
```

### C03

```json
{
  "verdict": "관찰",
  "results": [
    {
      "attack": "transfer",
      "succeeded": false,
      "authorities": {
        "transfer": {
          "type": "Owner"
        },
        "burn": {
          "type": "Owner"
        }
      },
      "error": {
        "name": "NoApprovals",
        "code": 26,
        "message": "Neither the asset or any plugins have approved this operation\n\nSource: Program > mplCore [CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d]\n"
      }
    },
    {
      "attack": "burn",
      "succeeded": false,
      "authorities": {
        "transfer": {
          "type": "Owner"
        },
        "burn": {
          "type": "Owner"
        }
      },
      "error": {
        "name": "NoApprovals",
        "code": 26,
        "message": "Neither the asset or any plugins have approved this operation\n\nSource: Program > mplCore [CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d]\n"
      }
    }
  ]
}
```

### O01

```json
{
  "verdict": "PASS",
  "stage_seconds": 2592000,
  "immediate_growth": "TooEarly",
  "state_unchanged": true
}
```

### O02

```json
{
  "verdict": "PASS",
  "instruction_count": 10,
  "successful_samples": 100
}
```

### O03

```json
{
  "verdict": "PASS",
  "signature": "3rQh8tqoobK9m4gkrJzGYVeXA2kVufz6wFVATtBzfam1dEopAYz7GAsEf3erqgdKEvAH613c7mJu6xnK2WbP7qga",
  "matched_fields": [
    "child",
    "parent_a",
    "parent_b",
    "seed"
  ]
}
```

### R01

```json
{
  "verdict": "RISK 재현",
  "nonce": "1000019",
  "attempts": 20,
  "duration_ms": 1.4782889999914914,
  "seed": "ce5baaeb06e974866229aacdbaf9c8f1a19dab231a81128b2c49ae23df82d3c9",
  "genome": [
    1,
    1,
    1,
    1,
    0,
    0,
    0
  ],
  "differing_loci": 6,
  "possible_genomes": 64,
  "target": [
    1,
    1,
    1,
    1,
    0,
    0,
    0
  ]
}
```

### R02

```json
{
  "verdict": "RISK 재현",
  "recipient_bound": false,
  "third_party_claimed": true
}
```

### R03

```json
{
  "verdict": "RISK 재현",
  "unauthorized_first_initializer_succeeded": true,
  "stage_seconds": 2592000
}
```

### S14

```json
{
  "verdict": "PASS",
  "fixture_only": true,
  "owner_classes": [
    "system",
    "hatchmind"
  ],
  "entrypoints": [
    "record_evolution",
    "request_breeding.asset_a",
    "request_breeding.asset_b"
  ],
  "error": "InvalidCoreAsset"
}
```

### S16

```json
{
  "invalid_founders": "InvalidFounder",
  "method": "독립 로컬 검증기에서 simulate",
  "config_created": false
}
```

## 비용·Pages·devnet

- 명령 10개 CU·rent 실측: [COSTS.md](COSTS.md).
- Pages 이미지 95개 참조 조사와 빌드 크기: [PAGES_ASSETS.md](PAGES_ASSETS.md).
- devnet은 사용자 승인 전 미실행: [DEVNET.md](DEVNET.md).

## 실행 환경

```text
rustc 1.98.0 (88d9e12ae 2026-08-18)
solana-cli 3.1.10 (src:7bc9c805; feat:1620780344, client:Agave)
anchor-cli 0.30.1
v24.10.0
1.22.22
solana-cargo-build-sbf 3.1.10
platform-tools v1.52
rustc 1.89.0
Linux 6.18.33.2-microsoft-standard-WSL2
@coral-xyz/anchor 0.30.1
@metaplex-foundation/mpl-core 1.1.0
@metaplex-foundation/umi 0.9.2
```

proptest 1.6.0 (logic dev-dependency만 추가), 512표본 × 4속성. 나머지 기존 의존성 버전과 루트 Cargo.lock·yarn.lock은 유지했습니다.

Core 0.15.3 SHA-256: `5b4dacdae4af476d3c9d8aa6712883f559ba0e13705f9b244d96d1fd0dd56ce5`.
운영 SBF SHA-256: `7050b8425114281f2152fb68b74c3cc52c24c087e218fbac6cd34e8b7cff387c`.
