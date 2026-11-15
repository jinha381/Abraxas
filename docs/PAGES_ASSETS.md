# Pages 자산 참조 감사

- 감사 시각(UTC): 2026-11-15T06:53:31.170Z
- 빌드 전: 20593784 bytes / 빌드 후: 20593784 bytes / 절감: 0 bytes
- parts.png와 rabbit-parts.png는 도감의 동적 경로에서 사용하므로 제외하지 않습니다.
- px/ 및 sprites/는 동적 스프라이트 경로를 보수적으로 유지합니다.
- 현재 미참조가 확인된 파일은 없습니다. 추후 추가 자산은 audit-game-assets.cjs의 참조 판정 후 복사합니다.
- `node scripts/build-game.cjs /tmp/site` 실행 성공. px manifest의 필수 파일 검사도 유지했습니다.
- 로컬 HTTP에서 정원(home)·향기 실험실(lab)·성향 트리(traits)의 DOM과 이미지 10건을 검사해 깨진 이미지 0건·DOM 오류 0건을 확인했습니다.
- 2026-11-15 07:58:32~08:00:33 UTC에 별도 프로필의 Edge headless로 같은 `/tmp/site`를 로컬 서버에서 열어 세 화면의 실제 PNG 렌더링도 확인했습니다. 펫·실험실 꽃·성향 트리가 표시되며 이미지 깨짐은 보이지 않았습니다. favicon.ico 404는 게임 이미지와 별개입니다.
- 화면 기록은 Git 제외 파일 `.local/pages-home.png`, `.local/pages-lab.png`, `.local/pages-traits.png`입니다. 게임 소스와 동작은 수정하지 않았습니다.

| 파일 | bytes | 배포 | 참조 근거 |
|---|---:|---|---|
| assets/evolution.png | 1780629 | 포함 | app.js의 파일명·도감 키 참조 |
| assets/hatching.png | 1236212 | 포함 | app.js의 파일명·도감 키 참조 |
| assets/hybrid.png | 1271658 | 포함 | app.js의 파일명·도감 키 참조 |
| assets/nursery.png | 1845652 | 포함 | app.js의 파일명·도감 키 참조 |
| assets/parts.png | 1414265 | 포함 | app.js의 파일명·도감 키 참조 |
| assets/px/adult-0-blink.png | 88813 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-0-happy.png | 88872 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-0.png | 89858 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-1-blink.png | 68414 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-1-happy.png | 68424 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-1.png | 68809 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-2-blink.png | 64812 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-2-happy.png | 64808 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-2.png | 65222 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-3-blink.png | 62924 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-3-happy.png | 62981 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/adult-3.png | 63889 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-0-blink.png | 67361 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-0-happy.png | 67374 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-0.png | 68082 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-1-blink.png | 61399 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-1-happy.png | 61401 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-1.png | 61928 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-2-blink.png | 68026 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-2-happy.png | 68032 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-2.png | 68660 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-3-blink.png | 63341 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-3-happy.png | 63431 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/baby-3.png | 64523 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/egg-0.png | 49013 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/egg-1.png | 46649 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/egg-2.png | 49572 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/egg-3.png | 45302 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-0-0-blink.png | 80540 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-0-0-happy.png | 80555 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-0-0.png | 80950 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-0-1-blink.png | 80579 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-0-1-happy.png | 80598 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-0-1.png | 81298 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-1-0-blink.png | 85336 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-1-0-happy.png | 85337 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-1-0.png | 85708 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-1-1-blink.png | 93898 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-1-1-happy.png | 93924 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-1-1.png | 94247 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-2-0-blink.png | 67906 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-2-0-happy.png | 67914 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-2-0.png | 68385 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-2-1-blink.png | 74981 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-2-1-happy.png | 74979 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-2-1.png | 75569 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-3-0-blink.png | 75850 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-3-0-happy.png | 75881 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-3-0.png | 76254 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-3-1-blink.png | 67137 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-3-1-happy.png | 67169 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/evo-3-1.png | 68116 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/px/manifest.json | 1184 | 포함 | px/ 동적 스프라이트·manifest 검증 유지 |
| assets/rabbit-parts.png | 1274360 | 포함 | app.js의 파일명·도감 키 참조 |
| assets/reference.png | 1982322 | 포함 | app.js의 파일명·도감 키 참조 |
| assets/sprites/adult-0.png | 112770 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/adult-1.png | 83082 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/adult-2.png | 81816 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/adult-3.png | 76308 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/baby-0.png | 102498 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/baby-1.png | 94109 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/baby-2.png | 97003 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/baby-3.png | 94550 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/egg-0.png | 66666 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/egg-1.png | 64980 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/egg-2.png | 71877 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/egg-3.png | 62596 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/evo-0-0.png | 98976 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/evo-0-1.png | 98562 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/evo-1-0.png | 106800 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/evo-1-1.png | 105934 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/evo-2-0.png | 90234 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/evo-2-1.png | 113227 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/evo-3-0.png | 90646 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/evo-3-1.png | 100371 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/hatch-0.png | 96767 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/hatch-1.png | 89399 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/hatch-2.png | 86841 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/hatch-3.png | 87377 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/hatchanim-0.png | 87564 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/hatchanim-1.png | 95710 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/hatchanim-2.png | 105190 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/hatchanim-3.png | 97520 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/hatchanim-4.png | 138456 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/walk-0.png | 171402 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/walk-1.png | 173051 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/walk-2.png | 170809 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/sprites/walk-3.png | 171824 | 포함 | img(name)의 동적 fallback 경로 유지 |
| assets/walking.png | 1236619 | 포함 | app.js의 파일명·도감 키 참조 |
| assets/weasel-evolution.png | 1199942 | 포함 | app.js의 파일명·도감 키 참조 |
