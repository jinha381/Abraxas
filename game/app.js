"use strict";
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const icon = (name) =>
    '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
  const wallets = ["dewey", "axie", "kitty", "tama"];
  const types = [
    {
      name: "탐색형",
      color: "#91a9c0",
      description: "탐색 기질이 가장 높아요. 새 자극에 먼저 다가가요.",
      speech: "이 돌, 어제도 여기 있었나?",
      branches: ["길잡이", "물결 관찰자"],
    },
    {
      name: "신중형",
      color: "#9ab18e",
      description: "경계 기질이 가장 높아요. 낯선 자극은 지켜본 뒤 움직여요.",
      speech: "여기서 조금만 더 지켜볼래요.",
      branches: ["이끼 수호자", "고요한 현자"],
    },
    {
      name: "친화형",
      color: "#d4a3ac",
      description: "친화 기질이 가장 높아요. 다른 펫과의 교류에 잘 반응해요.",
      speech: "오늘도 같이 있어 줄 거죠?",
      branches: ["꽃잎 친구", "포근한 동반자"],
    },
    {
      name: "독립형",
      color: "#a7aaa6",
      description: "독립 기질이 가장 높아요. 혼자 있을 때 안정돼요.",
      speech: "곁에만 있어도 충분해요.",
      branches: ["바람 유랑자", "달빛 은둔자"],
    },
  ];
  const stageNames = ["알", "아기", "성장기", "진화"];
  const source = {
    reference: { file: "reference.png", w: 1536, h: 1024 },
    nursery: { file: "nursery.png", w: 1536, h: 1024 },
    evolution: { file: "evolution.png", w: 1536, h: 1024 },
    walking: { file: "walking.png", w: 2172, h: 724 },
    hatching: { file: "hatching.png", w: 2172, h: 724 },
  };
  const grownClips = [
    [24, 121, 355, 233],
    [419, 149, 325, 204],
    [788, 151, 320, 204],
    [1160, 182, 355, 169],
  ];
  const eggClips = [
    [310, 139, 215, 190],
    [309, 374, 215, 172],
    [307, 580, 215, 176],
    [307, 782, 215, 178],
  ];
  const babyClips = [
    [1090, 145, 390, 180],
    [1090, 371, 390, 172],
    [1090, 578, 390, 179],
    [1090, 780, 390, 180],
  ];
  const hatchClips = [
    [690, 138, 260, 190],
    [690, 371, 260, 178],
    [690, 577, 260, 180],
    [690, 777, 260, 183],
  ];
  const evolvedClips = [
    [
      [620, 123, 380, 183],
      [1070, 137, 425, 169],
    ],
    [
      [620, 349, 380, 182],
      [1070, 359, 425, 172],
    ],
    [
      [620, 578, 380, 165],
      [1070, 574, 425, 169],
    ],
    [
      [615, 770, 385, 159],
      [1070, 765, 425, 164],
    ],
  ];
  function sprite(sheet, clip, label = "", extra = "") {
    const src = source[sheet],
      [x, y, w, h] = clip;
    return (
      '<svg class="sprite ' +
      extra +
      '" viewBox="' +
      x +
      " " +
      y +
      " " +
      w +
      " " +
      h +
      '" role="img" aria-label="' +
      esc(label) +
      '"><image href="assets/' +
      src.file +
      '" x="0" y="0" width="' +
      src.w +
      '" height="' +
      src.h +
      '" preserveAspectRatio="none"/></svg>'
    );
  }
  function img(name, label = "", extra = "") {
    return (
      '<img class="sprite ' + extra + '" src="assets/sprites/' + name +
      '.png" alt="' + esc(label) + '" draggable="false">'
    );
  }
  function petSprite(p, extra = "") {
    if (p.stage === 0) return img("egg-" + p.type, p.name + "의 알", extra);
    if (p.stage === 1) return img("baby-" + p.type, p.name + "의 아기 모습", extra);
    if (p.stage === 3)
      return img("evo-" + p.type + "-" + (p.branch || 0), p.name + "의 진화 모습", extra);
    return img("adult-" + p.type, p.name, extra);
  }
  function freshState() {
    const now = Date.now();
    return {
      version: 1,
      wallet: "dewey",
      selected: "founder-0",
      food: 12,
      night: false,
      sound: false,
      filter: "all",
      request: null,
      gifts: [],
      pets: ["듀이", "셸리", "액시", "루나"].map((name, type) => ({
        id: "founder-" + type,
        name,
        type,
        owner: wallets[type],
        stage: 2,
        changedAt: now - 10000,
        birth: now,
        parents: [],
        stats: {
          food: 72 - type * 5,
          energy: 84 - type * 4,
          friendship: 68 + type * 3,
        },
        plays: 0,
        rests: 0,
      })),
      logs: [
        { text: "최초 개체 4마리가 등록됐어요.", at: now - 12 * 60000 },
        { text: "듀이가 새 자극에 반응했어요.", at: now - 8 * 60000 },
        { text: "셸리가 휴식했어요.", at: now - 3 * 60000 },
      ],
    };
  }
  let state;
  try {
    const saved = JSON.parse(
      localStorage.getItem("hatchmind-garden-v2") || "null",
    );
    const valid =
      saved?.version === 1 &&
      wallets.includes(saved.wallet) &&
      Array.isArray(saved.pets) &&
      saved.pets.length >= 4 &&
      saved.pets.every(
        (p) =>
          Number.isInteger(p.type) &&
          p.type >= 0 &&
          p.type < 4 &&
          Number.isInteger(p.stage) &&
          p.stage >= 0 &&
          p.stage < 4 &&
          p.stats,
      );
    state = valid ? saved : freshState();
  } catch {
    state = freshState();
  }
  let route = "home",
    toastTimer,
    datingA,
    datingB,
    busyHatch = new Set();
  const main = $("#main"),
    dialog = $("#dialog");
  function save() {
    try {
      localStorage.setItem("hatchmind-garden-v2", JSON.stringify(state));
    } catch {
      /* The demo remains usable when browser storage is unavailable. */
    }
  }
  function petById(id) {
    return state.pets.find((p) => p.id === id);
  }
  function selected() {
    return petById(state.selected) || state.pets[0];
  }
  function mine() {
    return state.pets.filter((p) => p.owner === state.wallet);
  }
  function addLog(text) {
    state.logs.push({ text, at: Date.now() });
    state.logs = state.logs.slice(-30);
  }
  function toast(text) {
    clearTimeout(toastTimer);
    $("#toast").textContent = text;
    $("#toast").classList.add("show");
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3300);
  }
  function timeText(ts) {
    return new Date(ts).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  function chirp() {
    if (!state.sound) return;
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      const ctx = new A(),
        o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(659, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.035, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.26);
      o.onended = () => ctx.close();
    } catch {}
  }
  function navigate(next) {
    if (location.hash === "#" + next) {
      route = next;
      render();
    } else location.hash = next;
  }
  function heading(label, title, description, extra = "") {
    return (
      '<div class="page-heading"><div><div class="eyebrow">' +
      label +
      "</div><h1>" +
      title +
      "</h1><p>" +
      description +
      "</p></div>" +
      extra +
      "</div>"
    );
  }
  function button(action, text, cls = "", attrs = "") {
    return (
      '<button class="button ' +
      cls +
      '" data-action="' +
      action +
      '" ' +
      attrs +
      ">" +
      text +
      "</button>"
    );
  }
  function stats(p) {
    return [
      ["포만감", p.stats.food, "#a6b892"],
      ["에너지", p.stats.energy, "#95acba"],
      ["친밀도", p.stats.friendship, "#c7a3aa"],
    ]
      .map(
        ([label, n, color]) =>
          '<div><div class="stat-label"><span>' +
          label +
          "</span><b>" +
          Math.round(n) +
          ' <span>/ 100</span></b></div><div class="stat-track"><div class="stat-fill" style="width:' +
          clamp(n) +
          "%;background:" +
          color +
          '"></div></div></div>',
      )
      .join("");
  }
  function growthSteps(p) {
    return (
      '<div class="growth-steps">' +
      stageNames
        .map(
          (name, i) =>
            '<span class="growth-step ' +
            (i <= p.stage ? "done " : "") +
            (i === p.stage ? "current" : "") +
            '"><i></i>' +
            name +
            "</span>",
        )
        .join("") +
      "</div>"
    );
  }
  function profile(p) {
    const own = p.owner === state.wallet,
      seconds = Math.max(
        0,
        Math.ceil((p.changedAt + 3000 - Date.now()) / 1000),
      );
    let growText =
      p.stage === 3 ? "진화 완료" : p.stage === 0 ? "부화시키기" : "성장하기";
    return (
      '<section class="panel pet-panel"><div class="panel-label"><span>선택한 펫</span><span class="pet-badge" style="color:' +
      types[p.type].color +
      '">' +
      types[p.type].name +
      '</span></div><div class="portrait-wrap"><div class="portrait-halo"></div>' +
      petSprite(p) +
      '</div><div class="pet-name-row"><h2>' +
      esc(p.name) +
      '</h2><span class="stage-badge">' +
      stageNames[p.stage] +
      '</span></div><p class="pet-description">' +
      types[p.type].description +
      "</p>" +
      growthSteps(p) +
      '<div class="stats">' +
      stats(p) +
      '</div><div class="pet-bottom"><span>' +
      esc(p.owner === "escrow" ? "선물 보관 중" : p.owner + "의 친구") +
      '</span><button data-action="grow" ' +
      (!own || p.stage === 3 ? "disabled" : "") +
      ">" +
      esc(seconds > 0 ? seconds + "초 후 성장" : growText) +
      icon("arrow") +
      "</button></div></section>"
    );
  }
  function activity() {
    return (
      '<section class="panel activity-panel"><div class="activity-title"><strong>활동 기록</strong><span>최근</span></div>' +
      state.logs
        .slice(-3)
        .reverse()
        .map(
          (l) =>
            '<div class="activity-entry"><span class="entry-dot"></span><div><p>' +
            esc(l.text) +
            "</p><time>" +
            timeText(l.at) +
            "</time></div></div>",
        )
        .join("") +
      "</section>"
    );
  }
  function friendCard(p) {
    return (
      '<button class="friend-card ' +
      (p.id === state.selected ? "selected" : "") +
      '" data-action="select" data-pet="' +
      esc(p.id) +
      '" style="--pet-color:' +
      types[p.type].color +
      '">' +
      (p.id === state.selected
        ? '<span class="friend-check">' + icon("check") + "</span>"
        : "") +
      petSprite(p) +
      '<strong><span class="friend-type-dot"></span>' +
      esc(p.name) +
      "</strong><small>" +
      types[p.type].name +
      " · " +
      stageNames[p.stage] +
      "</small></button>"
    );
  }
  function home() {
    const p = selected(),
      date = new Date().toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
      });
    return (
      heading(
        "",
        "정원",
        "펫을 선택하고 먹이·놀이·휴식으로 돌봐요.",
        '<div class="date-chip">' + icon("sun") + date + "</div>",
      ) +
      '<div class="home-grid"><div class="left-stack"><section class="panel world-panel"><div class="world-top"><div><strong>' +
      selected().name +
      '</strong><p>' + types[selected().type].name + ' · ' + stageNames[selected().stage] + '</p></div><span class="weather">' +
      icon(state.night ? "moon" : "sun") +
      (state.night ? "밤" : "낮") +
      '</span></div><div class="world-art">' +
      '<span class="cloud c1"></span><span class="cloud c2"></span><span class="sky-orb"></span>' +
      '<div class="stage-row">' +
      state.pets
        .filter((q) => q.owner !== "escrow")
        .slice(0, 6)
        .map(
          (q) =>
            '<button class="world-hotspot ' +
            (p.id === q.id ? "active" : "") +
            '" data-action="select" data-pet="' +
            q.id +
            '" aria-label="' + esc(q.name) + ' 선택">' +
            (p.id === q.id
              ? '<span class="speech" id="speech">' + types[p.type].speech + "</span>"
              : "") +
            petSprite(q) +
            '<span class="name-tag">' +
            esc(q.name) +
            "</span></button>",
        )
        .join("") +
      '</div><div class="ground"></div></div>' +
      '<div class="world-bottom"><span class="peace">' +
      icon("leaf") +
      ' 펫을 눌러 선택</span><span class="world-pills"><span></span><span></span><span></span></span></div></section>' +
      '<div class="care-bar">' +
      [
        ["feed", "carrot", "먹이 주기", "당근 " + state.food + "개"],
        ["play", "heart", "함께 놀기", "친밀도 상승"],
        ["rest", "leaf", "쉬어 가기", "에너지 회복"],
      ]
        .map(
          ([a, i, title, desc]) =>
            '<button class="care-button" data-action="' +
            a +
            '" ' +
            (p.owner !== state.wallet || p.stage === 0 ? "disabled" : "") +
            '><span class="action-icon">' +
            icon(i) +
            "</span><span><strong>" +
            title +
            "</strong><small>" +
            desc +
            "</small></span></button>",
        )
        .join("") +
      "</div>" +
      '<section><div class="section-title"><h2>펫 목록 <span>' +
      state.pets.filter((q) => q.stage > 0).length +
      '</span></h2><a href="#collection" class="text-link">모두 보기 ' +
      icon("arrow") +
      '</a></div><div class="friends-grid">' +
      state.pets.slice(0, 4).map(friendCard).join("") +
      "</div></section>" +
      '<div class="community-grid"><a href="#dating" class="community-card"><span class="community-symbol">' +
      icon("heart") +
      "</span><span><strong>만남 요청</strong><small>두 펫을 골라 교배를 요청해요.</small></span>" +
      icon("arrow") +
      '</a><a href="#eggs" class="community-card"><span class="community-symbol">' +
      icon("egg") +
      "</span><span><strong>알 둥지</strong><small>부화시키거나 선물해요.</small></span>" +
      icon("arrow") +
      '</a></div></div><aside class="right-stack">' +
      profile(p) +
      activity() +
      "</aside></div>"
    );
  }
  function collection() {
    const shown =
      state.filter === "mine"
        ? mine()
        : state.pets.filter((p) => p.owner !== "escrow");
    return (
      heading(
        "",
        "친구들",
        "등록된 모든 펫의 성장 단계와 상태예요.",
        button("gallery", "유전 특성 보기", "small", 'data-gallery="parts"'),
      ) +
      '<div class="filter-row"><button class="filter-button ' +
      (state.filter === "all" ? "active" : "") +
      '" data-action="filter" data-filter="all">숲의 모든 친구</button><button class="filter-button ' +
      (state.filter === "mine" ? "active" : "") +
      '" data-action="filter" data-filter="mine">나의 친구 ' +
      mine().length +
      '</button></div><div class="collection-grid">' +
      shown
        .map(
          (p) =>
            '<article class="panel collection-card">' +
            petSprite(p) +
            '<div class="pet-name-row" style="justify-content:flex-start"><h2>' +
            esc(p.name) +
            '</h2><span class="stage-badge">' +
            stageNames[p.stage] +
            "</span></div><p>" +
            types[p.type].name +
            " · " +
            esc(p.owner) +
            '</p><div class="stats">' +
            stats(p) +
            "</div>" +
            button(
              "visit",
              "함께 시간 보내기 " + icon("arrow"),
              "wide small",
              'data-pet="' + p.id + '"',
            ) +
            "</article>",
        )
        .join("") +
      "</div>"
    );
  }
  function parentOptions(value) {
    return state.pets
      .filter((p) => p.stage >= 2 && p.owner !== "escrow")
      .map(
        (p) =>
          '<option value="' +
          p.id +
          '" ' +
          (p.id === value ? "selected" : "") +
          ">" +
          esc(p.name) +
          " · " +
          esc(p.owner) +
          "</option>",
      )
      .join("");
  }
  function parent(p, which) {
    return (
      '<div class="parent-card">' +
      petSprite(p) +
      '<select id="parent-' +
      which +
      '" aria-label="' +
      (which === "a" ? "첫 번째" : "두 번째") +
      ' 부모 선택">' +
      parentOptions(p.id) +
      "</select><small>" +
      types[p.type].name +
      " · " +
      stageNames[p.stage] +
      "</small></div>"
    );
  }
  function dating() {
    const candidates = state.pets.filter(
      (p) => p.stage >= 2 && p.owner !== "escrow",
    );
    if (!datingA || !petById(datingA))
      datingA = (
        candidates.find((p) => p.owner === state.wallet) || candidates[0]
      ).id;
    if (!datingB || !petById(datingB))
      datingB = (candidates.find((p) => p.id !== datingA) || candidates[0]).id;
    const req = state.request,
      a = petById(req ? req.a : datingA),
      b = petById(req ? req.b : datingB);
    let content =
      parent(a, "a") +
      '<span class="pair-heart">' +
      icon("heart") +
      "</span>" +
      parent(b, "b");
    let steps;
    if (req) {
      const expired = Date.now() >= req.expires;
      steps =
        '<div class="consent-list">' +
        [
          [req.ownerA, req.consentA],
          [req.ownerB, req.consentB],
        ]
          .map(
            ([name, yes]) =>
              '<div class="consent-row ' +
              (yes ? "approved" : "") +
              '"><span>' +
              esc(name) +
              '의 동의</span><span class="consent-status">' +
              (yes ? icon("check") + " 동의 완료" : "기다리는 중") +
              "</span></div>",
          )
          .join("") +
        '</div><p class="consent-help">남은 시간 <span class="deadline" data-until="' +
        req.expires +
        '"></span> · 양쪽 소유자가 동의해야 알이 태어나요.</p>' +
        (!req.consentB
          ? button(
              "approve",
              esc(req.ownerB) + "로 전환해 동의 체험",
              "soft wide",
              expired ? "disabled" : "",
            )
          : "") +
        button(
          "breed",
          icon("egg") + " 새로운 알 만나기",
          "primary wide",
          !req.consentA || !req.consentB || expired ? "disabled" : "",
        ) +
        button("cancel-request", "만남 취소하기", "small wide");
    } else
      steps =
        '<div class="step-info">' +
        icon("leaf") +
        " 먼저 서로를 알아가는 작은 만남부터 시작해요.<br>같은 소유자의 서로 다른 두 친구도 함께할 수 있어요.</div>" +
        button("request", icon("heart") + " 만남 요청하기", "primary wide");
    return (
      heading(
        "",
        "만남",
        "성장기 이상인 두 펫을 고르고, 두 소유자가 모두 동의하면 알이 생겨요.",
      ) +
      '<div class="dating-layout"><section class="panel dating-panel"><div class="pair-grid">' +
      content +
      "</div>" +
      steps +
      '<p class="dialog-caption" style="color:var(--muted);margin-top:17px">화면 체험용 동의입니다. 실제 지갑 서명이나 거래는 발생하지 않아요.</p></section><aside class="panel info-panel">' +
      icon("branch") +
      '<h2>유전 방식</h2><p>골격은 부모 한쪽에서 통째로, 귀·외피·꼬리·발·무늬·눈은 같은 기관끼리 부모 중 한쪽에서 물려받아요.</p><img src="assets/hybrid.png" alt="토끼와 거북의 특성을 이어받은 아이의 예시" loading="lazy">' +
      button(
        "gallery",
        "유전 이야기 자세히 보기 " + icon("arrow"),
        "small wide",
        'data-gallery="hybrid"',
      ) +
      "</aside></div>"
    );
  }
  function eggs() {
    const owned = mine().filter((p) => p.stage === 0),
      myGifts = state.gifts.filter((g) => g.giver === state.wallet);
    let content = owned.length
      ? '<div class="egg-grid">' +
        owned
          .map(
            (p) =>
              '<article class="panel egg-card">' +
              petSprite(p) +
              "<h2>" +
              esc(p.name) +
              '</h2><p>부화하면 성격 타입이 드러나요.</p><div class="stage-ready" data-growth-ready="' +
              p.id +
              '"></div><div class="egg-actions">' +
              button(
                "hatch",
                "부화시키기",
                "primary small",
                'data-pet="' + p.id + '"',
              ) +
              button(
                "gift",
                icon("gift") + " 선물하기",
                "small",
                'data-pet="' + p.id + '"',
              ) +
              "</div></article>",
          )
          .join("") +
        "</div>"
      : '<div class="panel empty-state">' +
        img("egg-2", "분홍 무늬가 있는 작은 알") +
        '<h2>알이 없어요.</h2><p>만남에서 교배하거나, 선물 코드로 알을 받을 수 있어요.</p><a class="button primary" href="#dating">' +
        icon("heart") +
        " 만남으로 가기</a></div>";
    content +=
      '<div class="gift-list"><div class="section-title"><h2>내가 건넨 작은 시작</h2>' +
      button(
        "gallery",
        "부화의 순간 살펴보기",
        "small",
        'data-gallery="hatching"',
      ) +
      "</div>" +
      (myGifts.length
        ? myGifts
            .slice()
            .reverse()
            .map((g) => {
              const p = petById(g.pet);
              return (
                '<div class="panel gift-row"><div><strong>' +
                esc(p?.name || "작은 알") +
                "</strong><small>" +
                (g.claimed
                  ? "새로운 친구에게 전달됐어요."
                  : g.reclaimed
                    ? "내 정원으로 돌아왔어요."
                    : '선물 보관 중 · <span class="deadline" data-until="' +
                      g.expires +
                      '"></span>') +
                "</small></div>" +
                (!g.claimed && !g.reclaimed
                  ? button(
                      "reclaim",
                      "만료된 알 회수",
                      "small",
                      'data-gift="' +
                        g.id +
                        '" data-reclaim="' +
                        g.expires +
                        '" ' +
                        (Date.now() < g.expires ? "disabled" : ""),
                    )
                  : "") +
                "</div>"
              );
            })
            .join("")
        : '<p class="route-description">보낸 선물이 없어요.</p>') +
      "</div>";
    return (
      heading(
        "",
        "알 둥지",
        "내 알을 부화시키거나 다른 지갑에 선물해요.",
        button("claim-dialog", icon("gift") + " 선물 받기", "small"),
      ) + content
    );
  }
  function family() {
    const children = state.pets.filter((p) => p.parents?.length === 2);
    return (
      heading(
        "",
        "가계도",
        "교배로 태어난 펫의 부모 기록이에요.",
        button(
          "gallery",
          "진화 이야기",
          "small",
          'data-gallery="weasel-evolution"',
        ),
      ) +
      (children.length
        ? children
            .map((p) => {
              const a = petById(p.parents[0]),
                b = petById(p.parents[1]);
              return (
                '<section class="panel family-card"><div class="family-head"><span>새로운 생명이 태어난 날</span><span>' +
                new Date(p.birth).toLocaleDateString("ko-KR") +
                '</span></div><div class="family-grid"><div>' +
                petSprite(a) +
                "<strong>" +
                esc(a.name) +
                "</strong><small>부모 A</small></div>" +
                icon("plus") +
                "<div>" +
                petSprite(b) +
                "<strong>" +
                esc(b.name) +
                "</strong><small>부모 B</small></div>" +
                icon("arrow") +
                "<div>" +
                petSprite(p) +
                "<strong>" +
                esc(p.name) +
                "</strong><small>" +
                stageNames[p.stage] +
                " · " +
                esc(p.owner === "escrow" ? "선물 보관 중" : p.owner) +
                "</small></div></div></section>"
              );
            })
            .join("")
        : '<section class="panel empty-state">' +
          icon("branch") +
          '<h2 style="margin-top:20px">아직 기록이 없어요.</h2><p>교배로 알이 생기면 부모와 자식이 여기에 기록돼요.</p><a href="#dating" class="button primary">만남으로 가기 ' +
          icon("arrow") +
          "</a></section>")
    );
  }
  function render() {
    const focus = document.activeElement,
      action = focus?.dataset?.action,
      petId = focus?.dataset?.pet,
      shouldRestore = main.contains(focus);
    main.innerHTML =
      '<div class="enter">' +
      ({ home, collection, dating, eggs, family }[route] || home)() +
      "</div>";
    document.body.classList.toggle("night", !!state.night);
    document.querySelectorAll("[data-route]").forEach((a) => {
      const active = a.dataset.route === route;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $("#breadcrumb-title").textContent =
      {
        home: "나의 정원",
        collection: "작은 친구들",
        dating: "새로운 만남",
        eggs: "알 보관함",
        family: "우리의 이야기",
      }[route] || "나의 정원";
    $("#wallet-select").value = state.wallet;
    $("#wallet-avatar").textContent = state.wallet[0].toUpperCase();
    $("#pet-count").textContent = state.pets.length;
    $("#egg-count").textContent = mine().filter((p) => p.stage === 0).length;
    $("#theme-button").innerHTML = icon(state.night ? "sun" : "moon");
    $("#theme-button").setAttribute(
      "aria-label",
      state.night ? "낮 풍경으로 바꾸기" : "밤 풍경으로 바꾸기",
    );
    $("#sound-button").setAttribute("aria-pressed", String(state.sound));
    $("#sound-button").setAttribute(
      "aria-label",
      state.sound ? "효과음 끄기" : "효과음 켜기",
    );
    $("#sidebar-egg").innerHTML = img("egg-1", "새로운 시작을 기다리는 세이지색 알");
    if (shouldRestore && action) {
      const match = [...main.querySelectorAll("[data-action]")].find(
        (e) =>
          e.dataset.action === action && (!petId || e.dataset.pet === petId),
      );
      match?.focus({ preventScroll: true });
    }
    if (state.request && route === "dating") {
      document
        .querySelectorAll(".parent-card select")
        .forEach((el) => (el.disabled = true));
    }
    tick();
  }
  function openDialog(title, body) {
    $("#dialog-content").innerHTML =
      '<div class="dialog-header"><h2>' +
      title +
      '</h2><button class="icon-button" data-action="close" aria-label="닫기">' +
      icon("close") +
      '</button></div><div class="dialog-body">' +
      body +
      "</div>";
    if (!dialog.open) dialog.showModal();
  }
  function gallery(which) {
    const items = {
      parts: [
        "기관 파츠",
        "귀·외피·꼬리·발·무늬·눈. 같은 기관끼리 부모의 특성을 이어받아요.",
      ],
      hybrid: [
        "교배 예시",
        "거북의 외피도 토끼 골격에 맞는 등판으로 변형되어 자연스럽게 어울려요.",
      ],
      hatching: [
        "부화 과정",
        "기니피그(친화형) 알의 부화 5단계예요.",
      ],
      "weasel-evolution": [
        "진화 갈래",
        "무엇을 경험했는지에 따라 바람 유랑자 또는 달빛 은둔자가 될 수 있어요.",
      ],
      "rabbit-parts": [
        "골격과 부착점",
        "기본 골격에 귀·꼬리·무늬·발·눈이 정해진 위치에 붙어요.",
      ],
      evolution: [
        "진화 갈래",
        "쌓인 경험에 따라 진화 A 또는 B로 갈라져요.",
      ],
    };
    const [title, desc] = items[which] || items.parts;
    openDialog(
      title,
      "<p>" +
        desc +
        '</p><img src="assets/' +
        (items[which] ? which : "parts") +
        '.png" alt="' +
        esc(title) +
        '"><div class="gallery-link-row">' +
        button("gallery", "기관 파츠", "small", 'data-gallery="parts"') +
        button(
          "gallery",
          "골격과 부착점",
          "small",
          'data-gallery="rabbit-parts"',
        ) +
        button("gallery", "진화 갈래", "small", 'data-gallery="evolution"') +
        "</div>",
    );
  }
  function care(action) {
    const p = selected();
    if (p.owner !== state.wallet)
      return toast("내 정원의 친구를 선택해 주세요.");
    if (p.stage === 0)
      return toast("알이 부화하면 함께 시간을 보낼 수 있어요.");
    if (action === "feed") {
      if (state.food < 1)
        return toast("먹이가 부족해요. 쉬어 가면 당근을 다시 모을 수 있어요.");
      state.food--;
      p.stats.food = clamp(p.stats.food + 14);
      p.stats.friendship = clamp(p.stats.friendship + 3);
    }
    if (action === "play") {
      if (p.stats.energy < 8)
        return toast("조금 피곤해 보여요. 먼저 함께 쉬어 주세요.");
      p.stats.energy = clamp(p.stats.energy - 8);
      p.stats.friendship = clamp(p.stats.friendship + 7);
      p.plays = (p.plays || 0) + 1;
    }
    if (action === "rest") {
      p.stats.energy = clamp(p.stats.energy + 15);
      p.stats.friendship = clamp(p.stats.friendship + 2);
      p.rests = (p.rests || 0) + 1;
      state.food = Math.min(99, state.food + 2);
    }
    const messages = {
      feed: p.name + ": 먹이 주기 · 포만감 상승",
      play: p.name + ": 함께 놀기 · 친밀도 상승",
      rest: p.name + ": 쉬어 가기 · 에너지 회복, 당근 +2",
    };
    addLog(messages[action]);
    save();
    chirp();
    render();
    toast(messages[action]);
    const speech = $("#speech");
    if (speech)
      speech.textContent = {
        feed: "오독오독… 고마워요!",
        play: "우리, 한 번 더 놀까요?",
        rest: "이렇게 있어도 참 좋아요.",
      }[action];
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const world = $(".world-panel");
      if (world) {
        const burst = document.createElement("span");
        burst.className = "illustration-burst";
        burst.textContent = action === "play" ? "♡" : "✦";
        world.append(burst);
        setTimeout(() => burst.remove(), 1500);
      }
    }
    if (
      action === "play" &&
      p.type === 1 &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      let f = 0;
      const id = p.id;
      const timer = setInterval(() => {
        const portrait = $(".portrait-wrap");
        if (!portrait || selected().id !== id || route !== "home") {
          clearInterval(timer);
          return;
        }
        portrait.innerHTML =
          '<div class="portrait-halo"></div>' +
          img("walk-" + (f % 4), p.name + "가 걷는 모습");
        if (++f >= 8) {
          clearInterval(timer);
          portrait.innerHTML =
            '<div class="portrait-halo"></div>' + petSprite(p);
        }
      }, 180);
    }
  }
  function checkGrowth(p) {
    if (!p || p.owner !== state.wallet) {
      toast("현재 소유자의 정원에서 성장시킬 수 있어요.");
      return false;
    }
    if (p.stage >= 3) {
      toast("이미 마지막 단계예요.");
      return false;
    }
    const wait = Math.ceil((p.changedAt + 3000 - Date.now()) / 1000);
    if (wait > 0) {
      toast("조금만 기다려 주세요. " + wait + "초 뒤에 성장할 수 있어요.");
      return false;
    }
    return true;
  }
  function hatch(p) {
    if (!checkGrowth(p) || busyHatch.has(p.id)) return;
    if (p.stage !== 0) return grow(p);
    busyHatch.add(p.id);
    let frame = 0;
    openDialog(
      "작은 친구가 깨어나요",
      '<div id="hatch-art">' +
        petSprite(p) +
        '</div><p style="text-align:center">부화 중…</p>',
    );
    const timer = setInterval(() => {
      frame++;
      const art = $("#hatch-art");
      if (art)
        art.innerHTML =
          p.type === 2
            ? img("hatchanim-" + Math.min(frame, 4), "알에서 아기가 깨어나는 모습", "framed")
            : img(frame < 3 ? "egg-" + p.type : "hatch-" + p.type, "작은 친구가 깨어나는 모습");
      if (frame >= 5) {
        clearInterval(timer);
        busyHatch.delete(p.id);
        p.stage = 1;
        p.changedAt = Date.now();
        addLog(p.name + "가 알을 깨고 세상에 나왔어요.");
        save();
        chirp();
        render();
        if (dialog.open)
          openDialog(
            "안녕, " + esc(p.name) + ".",
            petSprite(p) +
              '<p style="text-align:center">아기 단계가 됐어요.</p>' +
              button("close", "확인", "primary wide"),
          );
        else toast(p.name + "가 깨어났어요!");
      }
    }, 320);
  }
  function grow(p) {
    if (!checkGrowth(p)) return;
    if (p.stage === 0) return hatch(p);
    p.stage++;
    p.changedAt = Date.now();
    if (p.stage === 3) p.branch = (p.rests || 0) > (p.plays || 0) ? 1 : 0;
    addLog(p.name + "가 " + stageNames[p.stage] + " 단계로 자랐어요.");
    save();
    chirp();
    render();
    openDialog(
      p.stage === 3 ? "경험을 닮아, 나답게." : "조금 더 자랐어요.",
      petSprite(p) +
        '<p style="text-align:center">' +
        esc(p.name) +
        (p.stage === 3
          ? "가 " + types[p.type].branches[p.branch] + " 모습으로 진화했어요."
          : "와 함께할 이야기가 하나 더 늘었어요.") +
        "</p>" +
        button("close", "좋아, 함께하자", "primary wide"),
    );
  }
  function requestMeeting() {
    const a = petById(datingA),
      b = petById(datingB);
    if (a.id === b.id) return toast("서로 다른 두 친구를 선택해 주세요.");
    if (a.owner !== state.wallet)
      return toast("첫 번째 친구의 소유자(" + a.owner + ")로 전환해 주세요.");
    if (a.stage < 2 || b.stage < 2)
      return toast("성장기 이상의 친구끼리 만날 수 있어요.");
    state.request = {
      a: a.id,
      b: b.id,
      ownerA: a.owner,
      ownerB: b.owner,
      consentA: true,
      consentB: a.owner === b.owner,
      expires: Date.now() + 300000,
    };
    addLog(a.name + "와 " + b.name + "의 작은 만남이 시작됐어요.");
    save();
    render();
    toast(
      a.owner === b.owner
        ? "같은 지갑의 두 친구가 함께 동의했어요."
        : "상대 소유자의 동의를 기다리고 있어요.",
    );
  }
  function breed() {
    const r = state.request;
    if (!r) return;
    if (Date.now() >= r.expires)
      return toast("만남 요청이 만료됐어요. 취소 후 다시 시작해 주세요.");
    if (!r.consentA || !r.consentB)
      return toast("두 소유자의 동의가 필요해요.");
    const a = petById(r.a),
      b = petById(r.b);
    if (a.owner !== r.ownerA || b.owner !== r.ownerB)
      return toast("부모의 소유자가 바뀌었어요. 새로운 동의가 필요해요.");
    const child = {
      id: "child-" + Date.now().toString(36),
      name: ["푸른 알", "이끼 알", "분홍 알", "은빛 알"][a.type],
      type: a.type,
      owner: r.ownerA,
      stage: 0,
      changedAt: Date.now(),
      birth: Date.now(),
      parents: [a.id, b.id],
      stats: { food: 65, energy: 95, friendship: 35 },
      plays: 0,
      rests: 0,
    };
    state.pets.push(child);
    state.selected = child.id;
    state.wallet = r.ownerA;
    state.request = null;
    addLog(a.name + "와 " + b.name + " 사이에서 새로운 알이 태어났어요.");
    save();
    chirp();
    navigate("eggs");
    toast("알이 생겼어요. 알 둥지에서 확인하세요.");
  }
  function openGift(p) {
    if (!p || p.owner !== state.wallet || p.stage !== 0)
      return toast("내가 가진 알만 선물할 수 있어요.");
    openDialog(
      "알 선물하기",
      petSprite(p) +
        '<p>새로운 생명의 시작을 친구에게 선물해 보세요. 보내는 동안 알은 선물 보관함에 머물러요.</p><form id="gift-form"><input type="hidden" name="pet" value="' +
        p.id +
        '"><label for="gift-ttl">선물을 기다릴 시간</label><select id="gift-ttl" name="ttl"><option value="120">2분 · 화면 체험</option><option value="30">30초 · 만료와 회수 체험</option><option value="3600">1시간</option></select><button class="button primary wide" type="submit">' +
        icon("gift") +
        ' 선물 코드 만들기</button></form><p class="dialog-caption">이 브라우저 안에서 지갑 역할을 바꿔 주고받는 체험이에요. 실제 NFT는 이동하지 않아요.</p>',
    );
  }
  function createGift(form) {
    const p = petById(new FormData(form).get("pet"));
    if (!p || p.owner !== state.wallet || p.stage !== 0)
      return toast("현재 소유자의 알만 보낼 수 있어요.");
    const ttl = Number(new FormData(form).get("ttl"));
    if (![30, 120, 3600].includes(ttl)) return;
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const code =
      "HM-" +
      [...bytes]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    const g = {
      id: "gift-" + Date.now().toString(36),
      pet: p.id,
      giver: state.wallet,
      code,
      expires: Date.now() + ttl * 1000,
      claimed: false,
      reclaimed: false,
    };
    state.gifts.push(g);
    p.owner = "escrow";
    addLog(p.name + "가 새로운 친구를 기다리고 있어요.");
    save();
    render();
    openDialog(
      "작은 시작을 준비했어요.",
      '<p>친구의 지갑 역할로 전환한 뒤, 알 보관함의 <strong>선물 받기</strong>에서 아래 체험 코드를 입력해 보세요.</p><div class="code-box">' +
        code +
        '</div><input id="gift-code-copy" aria-label="복사할 체험 코드" readonly value="' +
        code +
        '">' +
        button(
          "copy-gift",
          "체험 코드 복사",
          "primary wide",
          'data-code="' + code + '"',
        ) +
        button(
          "try-claim",
          "다른 지갑으로 선물 받기 체험",
          "wide",
          'data-code="' + code + '"',
        ) +
        '<p class="dialog-caption">같은 브라우저의 저장 공간에서만 사용할 수 있는 화면 체험 코드예요.</p>',
    );
  }
  function claimDialog(code = "") {
    openDialog(
      "새로운 친구를 맞이해요.",
      "<p>지금은 <strong>" +
        esc(state.wallet) +
        '</strong>의 정원이에요. 선물 받은 체험 코드를 입력하면 알을 데려올 수 있어요.</p><form id="claim-form"><label for="claim-code">선물 코드</label><input id="claim-code" name="code" value="' +
        esc(code) +
        '" placeholder="HM-…" required autocomplete="off" spellcheck="false"><button class="button primary wide" type="submit">' +
        icon("egg") +
        ' 내 정원으로 데려오기</button></form><p class="dialog-caption">다른 기기의 실제 선물 링크를 청구하는 기능은 지갑 연동 후 사용할 수 있어요.</p>',
    );
  }
  function claimGift(form) {
    const code = String(new FormData(form).get("code") || "")
        .trim()
        .toUpperCase(),
      g = state.gifts.find((g) => g.code === code);
    if (!g) return toast("이 브라우저에서 만든 체험 코드를 확인해 주세요.");
    if (g.claimed || g.reclaimed)
      return toast("이미 사용했거나 회수한 선물이에요.");
    if (Date.now() >= g.expires)
      return toast(
        "선물 시간이 지났어요. 보낸 지갑에서 알을 회수할 수 있어요.",
      );
    const p = petById(g.pet);
    if (p.owner !== "escrow") return toast("선물 보관 상태를 확인해 주세요.");
    p.owner = state.wallet;
    g.claimed = true;
    g.recipient = state.wallet;
    state.selected = p.id;
    addLog(state.wallet + "의 정원에 " + p.name + "가 도착했어요.");
    save();
    dialog.close();
    navigate("eggs");
    chirp();
    toast("선물 받은 알이 도착했어요.");
  }
  function reclaim(id) {
    const g = state.gifts.find((g) => g.id === id);
    if (!g || g.giver !== state.wallet)
      return toast("선물을 보낸 지갑에서 회수할 수 있어요.");
    if (g.claimed || g.reclaimed)
      return toast("이미 전달하거나 회수한 선물이에요.");
    if (Date.now() < g.expires)
      return toast("아직 선물을 받을 시간이 남아 있어요.");
    const p = petById(g.pet);
    p.owner = g.giver;
    g.reclaimed = true;
    addLog(p.name + "가 보낸 이의 정원으로 돌아왔어요.");
    save();
    render();
    toast("알이 내 정원으로 돌아왔어요.");
  }
  function tick() {
    const growButton = main.querySelector('[data-action="grow"]'),
      current = selected();
    if (growButton && current.owner === state.wallet && current.stage < 3) {
      const n = Math.max(
        0,
        Math.ceil((current.changedAt + 3000 - Date.now()) / 1000),
      );
      growButton.innerHTML =
        esc(
          n > 0
            ? n + "초 후 성장"
            : current.stage === 0
              ? "부화시키기"
              : "성장하기",
        ) + icon("arrow");
    }
    if (
      route === "dating" &&
      state.request &&
      Date.now() >= state.request.expires
    ) {
      main
        .querySelectorAll('[data-action="approve"],[data-action="breed"]')
        .forEach((b) => (b.disabled = true));
    }
    document.querySelectorAll("[data-until]").forEach((el) => {
      const n = Math.max(
        0,
        Math.ceil((Number(el.dataset.until) - Date.now()) / 1000),
      );
      el.textContent =
        n > 0
          ? Math.floor(n / 60) + "분 " + String(n % 60).padStart(2, "0") + "초"
          : "기한 만료";
    });
    document
      .querySelectorAll("[data-reclaim]")
      .forEach((el) => (el.disabled = Date.now() < Number(el.dataset.reclaim)));
    document.querySelectorAll("[data-growth-ready]").forEach((el) => {
      const p = petById(el.dataset.growthReady);
      if (p) {
        const n = Math.max(
          0,
          Math.ceil((p.changedAt + 3000 - Date.now()) / 1000),
        );
        el.textContent =
          n > 0 ? n + "초 뒤에 깨어날 준비가 돼요." : "깨어날 준비가 되었어요.";
        const b = el.parentElement.querySelector('[data-action="hatch"]');
        if (b) b.disabled = n > 0 || busyHatch.has(p.id);
      }
    });
  }
  function setWallet(wallet) {
    if (!wallets.includes(wallet)) return;
    state.wallet = wallet;
    const own = mine()[0];
    if (own) state.selected = own.id;
    save();
    render();
  }
  document.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || target.disabled) return;
    const action = target.dataset.action,
      p = petById(target.dataset.pet) || selected();
    switch (action) {
      case "select":
        state.selected = p.id;
        save();
        render();
        break;
      case "visit":
        state.selected = p.id;
        save();
        navigate("home");
        break;
      case "feed":
      case "play":
      case "rest":
        care(action);
        break;
      case "grow":
        grow(p);
        break;
      case "hatch":
        hatch(p);
        break;
      case "sound":
        state.sound = !state.sound;
        save();
        render();
        chirp();
        toast(state.sound ? "효과음을 켰어요." : "효과음을 껐어요.");
        break;
      case "theme":
        state.night = !state.night;
        save();
        render();
        break;
      case "about":
        openDialog(
          "체험 모드 안내",
          "<p>제공해 주신 HatchMind 이미지를 사용한 게임 화면이에요. 먹이·놀이·휴식, 성장, 교배 동의, 알 선물과 회수를 이 브라우저에서 체험할 수 있어요.</p><p>위쪽 메뉴에서 dewey·axie·kitty·tama의 지갑 역할을 바꿀 수 있어요. 실제 지갑 연결, 서명, 블록체인 거래는 발생하지 않아요. 진행 상황은 브라우저 저장 공간을 사용할 수 있을 때 이 기기에 보관돼요.</p>" +
            button("close", "닫기", "primary wide"),
        );
        break;
      case "close":
        dialog.close();
        break;
      case "gallery":
        gallery(target.dataset.gallery);
        break;
      case "filter":
        state.filter = target.dataset.filter === "mine" ? "mine" : "all";
        save();
        render();
        break;
      case "request":
        requestMeeting();
        break;
      case "approve": {
        const r = state.request;
        if (!r) break;
        if (Date.now() >= r.expires) {
          toast("만남 요청이 만료됐어요.");
          break;
        }
        if (
          petById(r.a).owner !== r.ownerA ||
          petById(r.b).owner !== r.ownerB
        ) {
          toast("소유자가 바뀌어 새로운 동의가 필요해요.");
          break;
        }
        state.wallet = r.ownerB;
        r.consentB = true;
        addLog(r.ownerB + "가 작은 만남에 동의했어요.");
        save();
        render();
        toast(r.ownerB + "의 지갑 역할로 동의 체험을 마쳤어요.");
        break;
      }
      case "cancel-request":
        state.request = null;
        save();
        render();
        toast("만남을 취소했어요.");
        break;
      case "breed":
        breed();
        break;
      case "gift":
        openGift(p);
        break;
      case "claim-dialog":
        claimDialog();
        break;
      case "try-claim": {
        const g = state.gifts.find((g) => g.code === target.dataset.code);
        setWallet(wallets.find((w) => w !== g.giver));
        claimDialog(g.code);
        break;
      }
      case "copy-gift": {
        let copied = false;
        try {
          await navigator.clipboard.writeText(target.dataset.code);
          copied = true;
        } catch {
          const input = $("#gift-code-copy");
          input?.focus();
          input?.select();
          try {
            copied = document.execCommand("copy");
          } catch {}
        }
        toast(
          copied ? "체험 코드를 복사했어요." : "코드를 선택해 복사해 주세요.",
        );
        break;
      }
      case "reclaim":
        reclaim(target.dataset.gift);
        break;
    }
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "wallet-select") {
      setWallet(event.target.value);
      toast(state.wallet + "의 정원으로 왔어요.");
    }
    if (event.target.id === "parent-a") {
      datingA = event.target.value;
      render();
    }
    if (event.target.id === "parent-b") {
      datingB = event.target.value;
      render();
    }
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id === "gift-form") {
      event.preventDefault();
      createGift(event.target);
    }
    if (event.target.id === "claim-form") {
      event.preventDefault();
      claimGift(event.target);
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
  function readRoute() {
    const hash = location.hash.slice(1);
    route = ["home", "collection", "dating", "eggs", "family"].includes(hash)
      ? hash
      : "home";
    if (hash.startsWith("claim=")) {
      route = "eggs";
      render();
      claimDialog(decodeURIComponent(hash.slice(6)));
    } else render();
  }
  window.addEventListener("hashchange", readRoute);
  setInterval(tick, 1000);
  readRoute();
})();
