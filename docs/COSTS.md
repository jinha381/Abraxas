# 명령별 실제 실행 비용

- 측정 시각(UTC): 2026-11-15T07:36:10.388Z
- RPC: `http://127.0.0.1:8899` (로컬 검증기)
- Anchor 0.30.1, Core 프로그램 0.15.3, JS SDK 1.1.0, Umi 0.9.2, local-testing 3초 설정.
- 성공 트랜잭션의 RPC 메타데이터 `computeUnitsConsumed`, `fee`, `preBalances`/`postBalances`를 읽고 생성 직후 계정과 rent-exemption 최소액을 조회했습니다.
- CU는 Core CPI와 ComputeBudget 명령을 포함한 **트랜잭션 전체** 값입니다. 명령별 첫 성공을 대표값으로 쓰며 전체 표본의 최소~최대도 표시합니다. 실행 경로·PDA bump·플러그인에 따라 달라집니다.
- rent 최소액은 계정 크기별 RPC 최소값입니다. 실제 신규 계정 예치액도 함께 적었습니다. Core 예치액은 최소 rent보다 클 수 있습니다. 수수료와 rent를 합치거나 환급 가능액으로 단정하지 않습니다.

| 명령 | CU 대표 (최소~최대) | 표본 | 신규 계정 | rent 최소 lamports / SOL | 실제 예치 lamports / SOL | tx 수수료 lamports |
|---|---:|---:|---|---:|---:|---:|
| initialize | 12280 (12280~12280) | 1 | config(178B) | 2,129,760 / 0.002129760 | 2,129,760 / 0.002129760 | 5000 |
| register_pet | 25804 (22804~25804) | 4 | asset(133B), pet(160B) | 3,821,040 / 0.003821040 | 5,321,040 / 0.005321040 | 15000 |
| record_evolution | 10285 (7285~10285) | 18 | 없음 | 0 / 0.000000000 | 0 / 0.000000000 | 10000 |
| request_breeding | 23124 (17122~26122) | 28 | request(156B) | 1,976,640 / 0.001976640 | 1,976,640 / 0.001976640 | 10000 |
| approve_breeding | 6072 (6072~15072) | 19 | 없음 | 0 / 0.000000000 | 0 / 0.000000000 | 10000 |
| cancel_breeding | 6724 (3714~6724) | 2 | 없음 | 0 / 0.000000000 | 0 / 0.000000000 | 10000 |
| execute_breeding | 53714 (47714~58212) | 14 | childAsset(133B), child(160B) | 3,821,040 / 0.003821040 | 5,321,040 / 0.005321040 | 15000 |
| create_gift_claim | 20110 (18610~26110) | 7 | gift(123B) | 1,746,960 / 0.001746960 | 1,746,960 / 0.001746960 | 10000 |
| claim_egg | 12999 (12999~14966) | 6 | 없음 | 0 / 0.000000000 | 0 / 0.000000000 | 10000 |
| reclaim_gift | 12856 (12856~12856) | 1 | 없음 | 0 / 0.000000000 | 0 / 0.000000000 | 10000 |

## 대표 트랜잭션 근거

로컬 서명은 공개 Explorer에서 조회되지 않습니다. 원시 로그는 Git 제외 파일 `.local/cost-results.json`에 남습니다.

| 명령 | slot | 서명 |
|---|---:|---|
| initialize | 211 | `4NcqsYz2RpQN1jS9jzgcXUk6CZzJb4mGj5B6CMJfuMGFn7Fyo9QX9VBy7aUFUskTACABzAa5cDDR7x1kMXo4EFCP` |
| register_pet | 212 | `2yPitA96NerKpteiqoDnEYoM78fh3pjpg4u95kJUPxNibN5szacDwfW51kYsy9Rvc6HkjwhNCmK3Fr2AArksPMEV` |
| record_evolution | 224 | `4ihh9oDXPsykwrdD79vkyjegkiGDXaKJHuar6MH2mniA73NiV8jxZWeraZytkBoBewKomnvPHnEjp8nJSmaVVD1J` |
| request_breeding | 238 | `2notrt93RYRj5BMbGXPgQVQiroT4iBsQVrnwcQxTnrJJRLftZJyRLn5sTZZ6QiBT6Vm9YDpi1AqQZtd77QKa6Gzb` |
| approve_breeding | 241 | `2Zts6HSpLkNUHJy781cn8jWZ7cTksZMWuMa5X1D7BbdEnWwgrG9tDazeJKqxoNUNeRi1m3Z2BP4zGKfbEi9pDcaK` |
| cancel_breeding | 250 | `4pcTcmXHLknA5ALu197L3Le9823dH3Yx8TpTMvS7XNCuyHB2MhQxA2G9zHJvFqiZBBYp2ax8SwTvWq6SYB8u8Hh2` |
| execute_breeding | 265 | `2SdtT4r5hJG8obGqBwMKt6Leaif8DSsjh6T4nGFG1bRy5QtaT2EEVDvCNUGwDMg2gBvjtwXrAgtrXHWQ4zKb9fiD` |
| create_gift_claim | 274 | `2o624RdZ7XKdDHfhojnnNsqCmFPxCmKHDCgBHXLm9zRNey7xdmUajrv8HJa5p8ecgkgkLE2nWoqxkHJinnAp1wEr` |
| claim_egg | 275 | `34s5mopHgT4akvREyptbDGCQWp7fKh6ncNdX1TGbC9PtRTUqBQ9HFrepC4oSJo4dd9nsqpMJYgu93N7Vdufh5Jfa` |
| reclaim_gift | 288 | `oHdNB3NR2g6ouk7NbNJZcK8geCPbwQA67CNs4itzFGGYZ4Z5rjLEJyDyVReAFL251NTWd6thzNGLCMmT3tkVoEr` |

## 대표 신규 계정 상세

| 명령 / 계정 | 크기(B) | rent 최소 lamports | 실제 예치 lamports |
|---|---:|---:|---:|
| initialize / config | 178 | 2129760 | 2129760 |
| register_pet / asset | 133 | 1816560 | 3316560 |
| register_pet / pet | 160 | 2004480 | 2004480 |
| request_breeding / request | 156 | 1976640 | 1976640 |
| execute_breeding / childAsset | 133 | 1816560 | 3316560 |
| execute_breeding / child | 160 | 2004480 | 2004480 |
| create_gift_claim / gift | 123 | 1746960 | 1746960 |

재생성: `node scripts/cost-report.cjs` (실제 실행한 cost-results.json 필요). 실패 트랜잭션·프로그램 배포비·SDK 플러그인 변경 비용은 이 표의 측정 범위에 포함하지 않습니다.
