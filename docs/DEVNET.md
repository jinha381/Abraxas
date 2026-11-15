# Devnet 스모크 테스트

상태: **미실행 — 사용자 실행 승인 대기**. 배포·에어드롭·트랜잭션 전송을 수행하지 않았습니다.

`scripts/devnet-smoke.sh`와 `validation/devnet-smoke.ts`를 준비했습니다. 기본 실행은 네트워크 접근 전에 중단합니다. 승인 후에만 아래처럼 실행하며, 미리 잔액을 준비한 지갑과 기존 프로그램 ID에 맞는 배포 키가 필요합니다.

```bash
HATCHMIND_DEVNET_APPROVED=yes \
DEVNET_WALLET=/비공개/배포지갑.json \
DEVNET_PROGRAM_KEYPAIR=/비공개/프로그램키.json \
bash scripts/devnet-smoke.sh
```

기존 devnet 프로그램이 있으면 덮어쓰지 않고 중단합니다. devnet Core의 실제 바이너리를 고정 0.15.3 SHA-256과 대조하며, 다르면 배포 전에 중단합니다. 다른 Core 프로그램을 배포하거나 업그레이드하지 않습니다. 에어드롭은 자동으로 요청하지 않습니다.

배포 → 등록 2마리 → 단계별 성장 → 양측 동의 교배 → 선물 생성·청구를 실행합니다. 이 흐름은 **3초 local-testing 설정의 스모크 전용 빌드**를 사용합니다. 30일 운영 빌드는 `check-production.sh`가 독립 로컬 검증기에서 검증합니다.

실행하면 이 문서를 실제 트랜잭션 서명·Explorer 링크·결과로 갱신합니다. 지금은 실제 서명이나 통과 결과가 없습니다. 일회용 테스트 지갑은 메모리에서만 생성하므로 테스트 자산의 지속 운영 용도로 사용하지 않습니다.
