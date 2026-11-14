# 최종 로컬 테스트 결과

이 프로젝트는 기존 소스가 없는 상태에서 요청 정책으로 새로 작성했습니다.
기존 21개 테스트의 복원이 아니라, 공통 규칙 소스에 대한 신규 21개 테스트와 실제 Core 프로그램 통합 테스트 결과입니다.

- 실행 시각(UTC): 2026-11-14T07:53:09.563Z
- 순수 Rust: 21 통과 / 0 실패
- 온체인 통합: 27 통과 / 0 실패 / 0 보류
- Anchor 0.30.1 SBF + IDL 빌드: 성공
- TypeScript 타입 검사: 성공
- 네트워크: 로컬 검증기만 사용, devnet 배포 없음

## 실행 명령

```bash
bash scripts/setup.sh
bash scripts/check.sh
```

check.sh는 cargo test --locked → anchor keys sync → anchor build(local-testing) → yarn typecheck → anchor test --skip-build를 순서대로 실행하며 실패 시 중단합니다.
실제 Core 바이너리는 해시를 검증하여 로컬 genesis에 로드합니다. 소유권 이전은 SDK transferV1과 온체인 CPI를 사용합니다.

## Rust 테스트별 결과

| 테스트 | 결과 |
|---|---|
| baby_to_growth | PASS |
| cannot_repeat | PASS |
| cannot_reverse | PASS |
| cannot_skip | PASS |
| cooldown_boundary | PASS |
| deadline_adds_ttl | PASS |
| deadline_overflow_rejected | PASS |
| deadline_rejects_zero_negative_or_large | PASS |
| eggs_and_babies_cannot_breed | PASS |
| expiry_boundary_inclusive | PASS |
| final_stage_terminal | PASS |
| egg_to_baby | PASS |
| growth_to_evolved | PASS |
| mature_pets_can_breed | PASS |
| negative_clock_delta_rejected | PASS |
| production_wait_30_days | PASS |
| each_homologous_organ_comes_from_corresponding_parent | PASS |
| seed_is_ordered_and_nonce_sensitive | PASS |
| seed_matches_exact_domain_and_little_endian | PASS |
| wait_each_stage | PASS |
| identical_parents_preserve_genotype | PASS |

## 온체인 테스트별 결과

| 테스트 | 결과 | 시간(ms) |
|---|---|---:|
| Genesis: dewey/axie/kitty/tama receive rabbit/turtle/guinea-pig/weasel, one each | PASS | 1907 |
| Genesis: a fifth registration cannot duplicate a species | PASS | 52 |
| S01: a non-owner cannot evolve someone else's Core asset | PASS | 29 |
| S06: growth cannot skip a stage | PASS | 21 |
| S06: eggs cannot breed | PASS | 31 |
| Growth: all founders advance egg -> baby -> growth, waiting each stage | PASS | 9822 |
| S03: one asset cannot breed with itself | PASS | 57 |
| S01: only current owner A may create a request | PASS | 25 |
| S02: execute without owner B consent is rejected and leaves no egg | PASS | 762 |
| S01: a stranger cannot approve owner B's pet | PASS | 438 |
| S04: transfer pet A after both consent -> OwnerChanged | PASS | 1780 |
| S04: transfer pet B after consent -> OwnerChanged | PASS | 1899 |
| S11: cancelled breeding request cannot execute | PASS | 1434 |
| S01: stranger cannot cancel a breeding request | PASS | 491 |
| Expired: expired request rejects both approval and execution | PASS | 3289 |
| Invalid TTL: zero and negative request TTL are rejected | PASS | 47 |
| S12: cooldown rechecked at execution and new request; atomic rollback verified | PASS | 1749 |
| Normal breeding: two owners consent, exact SHA-256 seed and homologous inheritance recorded | PASS | 1383 |
| S05: replay cannot issue a second egg | PASS | 406 |
| Same-wallet breeding: transfer guinea pig kitty -> dewey; dewey request alone suffices | PASS | 3219 |
| S07: next growth is too early within the same transaction | PASS | 51 |
| S08: wrong gift secret rejected; actual egg stays in Gift PDA | PASS | 843 |
| S09: gift link cannot be claimed twice | PASS | 948 |
| S10: giver cannot reclaim before expiry | PASS | 867 |
| S01: stranger cannot create a gift for another owner's egg | PASS | 43 |
| Expired gift: claim fails at expiry; only original giver reclaims; replay rejected | PASS | 3801 |
| Growth: current Core owner can evolve through final stage; reverse and further evolution rejected | PASS | 6820 |

## 검증 해석

- 실패 시나리오는 트랜잭션이 기대한 정확한 HatchMind 오류를 내는지 확인합니다. 다른 계정 제약 오류나 CPI 오류를 성공으로 인정하지 않습니다.
- 소유자 변경 검증은 A와 B 양쪽을 실제 전송하여 확인합니다.
- 같은 지갑 교배는 기니피그를 kitty → dewey로 실제 전송한 후 dewey의 요청만으로 알을 발행합니다.
- 만료된 요청과 선물은 온체인 Clock 시각을 기다립니다. 만료 후 원래 선물자만 회수하는지 실제 Core 소유자로 확인합니다.
- 너무 빠른 성장과 쿨다운은 동일 트랜잭션에서 검사하여 시간 경합을 피하며, 실패한 트랜잭션의 상태 롤백도 확인합니다.
- 변경 파일과 호환성 수정은 CHANGES.md, 운영 전 보강점은 README.md를 참고하세요.

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
```
