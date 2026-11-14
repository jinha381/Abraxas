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
      description: "친화 기질이 가장 높아요. 다른 뉴로링과의 교류에 잘 반응해요.",
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
  /* ---------- 도트 스프라이트 ---------- */
  const PX = {"adult-0":{"w":318,"h":214,"face":1,"blink":true},"adult-1":{"w":316,"h":180,"face":0,"blink":true},"adult-2":{"w":289,"h":183,"face":-1,"blink":true},"adult-3":{"w":345,"h":151,"face":-1,"blink":true},"baby-0":{"w":244,"h":158,"face":-1,"blink":true},"baby-1":{"w":266,"h":146,"face":-1,"blink":true},"baby-2":{"w":271,"h":155,"face":-1,"blink":true},"baby-3":{"w":288,"h":143,"face":-1,"blink":true},"egg-0":{"w":168,"h":168,"face":0,"blink":false},"egg-1":{"w":172,"h":165,"face":0,"blink":false},"egg-2":{"w":178,"h":166,"face":0,"blink":false},"egg-3":{"w":177,"h":162,"face":0,"blink":false},"evo-0-0":{"w":279,"h":171,"face":1,"blink":true},"evo-0-1":{"w":319,"h":157,"face":-1,"blink":true},"evo-1-0":{"w":311,"h":164,"face":0,"blink":true},"evo-1-1":{"w":395,"h":151,"face":-1,"blink":true},"evo-2-0":{"w":269,"h":147,"face":-1,"blink":true},"evo-2-1":{"w":326,"h":147,"face":-1,"blink":true},"evo-3-0":{"w":333,"h":143,"face":-1,"blink":true},"evo-3-1":{"w":327,"h":136,"face":-1,"blink":true}};
  function spriteName(p) {
    if (p.stage === 0) return "egg-" + p.type;
    if (p.stage === 1) return "baby-" + p.type;
    if (p.stage === 3) return "evo-" + p.type + "-" + (p.branch || 0);
    return "adult-" + p.type;
  }
  function img(name, label = "", extra = "") {
    const src = PX[name] ? "assets/px/" + name + ".png" : "assets/sprites/" + name + ".png";
    return (
      '<img class="sprite ' + extra + '" src="' + src + '" alt="' + esc(label) + '" draggable="false">'
    );
  }
  function petSprite(p, extra = "") {
    const n = spriteName(p);
    const label =
      p.stage === 0 ? p.name + "의 알" : p.stage === 1 ? p.name + "의 아기 모습" : p.stage === 3 ? p.name + "의 진화 모습" : p.name;
    return img(n, label, extra);
  }

  /* ---------- 도트 아이콘 (12×12 비트맵 → SVG) ---------- */
  const ICONS = {
    home: ".....##.....|....####....|...######...|..########..|.##########.|..########..|..##....##..|..##.##.##..|..##.##.##..|..##.##.##..|..########..|............",
    leaf: "........###.|......#####.|.....######.|....#######.|...#######..|...######...|..#.####....|..##.##.....|.#..#.......|.#..........|#...........|............",
    heart: "............|..##...##...|.####.####..|.#########..|.#########..|.#########..|..#######...|...#####....|....###.....|.....#......|............|............",
    egg: "....####....|...######...|..########..|..##.#####..|.##.#######.|.##########.|.##########.|.##########.|..########..|...######...|............|............",
    grid: "............|.####.####..|.####.####..|.####.####..|.####.####..|............|.####.####..|.####.####..|.####.####..|.####.####..|............|............",
    branch: ".###....###.|.###....###.|.###....###.|..#......#..|..#......#..|..########..|.....#......|.....#......|....###.....|....###.....|....###.....|............",
    arrow: "............|............|.......#....|.......##...|.#########..|.##########.|.#########..|.......##...|.......#....|............|............|............",
    chevron: "............|...#........|...##.......|....##......|.....##.....|......##....|.....##.....|....##......|...##.......|...#........|............|............",
    carrot: "..........##|........###.|.......#.##.|.....####...|....#####...|...#####....|..#####.....|..####......|.###........|.##.........|.#..........|............",
    spark: ".....#......|.....#......|....###.....|....###.....|.#########..|...#####....|....###.....|....###.....|.....#......|.....#......|............|............",
    sun: ".....#......|.#...#...#..|..#.....#...|....###.....|...#####....|##.#####.##.|...#####....|....###.....|..#.....#...|.#...#...#..|.....#......|............",
    moon: "...#####....|..###.......|.###........|.##.........|###.........|###.........|###.........|.##.........|.###......#.|..###....##.|...#######..|............",
    volume: "............|....#.......|...##...#...|.####.#..#..|.####..#.#..|.####..#.#..|.####.#..#..|...##...#...|....#.......|............|............|............",
    check: "............|..........#.|.........##.|........##..|.#.....##...|.##...##....|..##.##.....|...###......|....#.......|............|............|............",
    gift: "..##...##...|...#..#.....|....##......|.##########.|.##########.|.....#......|.####.####..|.####.####..|.####.####..|.####.####..|.####.####..|............",
    close: "............|.##......##.|..##....##..|...##..##...|....####....|.....##.....|....####....|...##..##...|..##....##..|.##......##.|............|............",
    clock: "...######...|..#......#..|.#...#....#.|.#...#....#.|.#...#....#.|.#...###..#.|.#........#.|.#........#.|..#......#..|...######...|............|............",
    plus: "............|.....##.....|.....##.....|.....##.....|.##########.|.##########.|.....##.....|.....##.....|.....##.....|............|............|............",
    wallet: "............|.########...|.#.......#..|.##########.|.#........#.|.#.....####.|.#.....#.##.|.#.....####.|.#........#.|.##########.|............|............",
    flag: ".#..........|.#######....|.########...|.#######....|.######.....|.#######....|.#..........|.#..........|.#..........|.#..........|.#..........|............",
    eye: "............|............|...######...|..#......#..|.#...##...#.|#...####...#|.#...##...#.|..#......#..|...######...|............|............|............",
    refresh: "....####.#..|..##....##..|.#.....###..|.#..........|#...........|#..........#|#..........#|..........#.|..###.....#.|..##....##..|..#.####....|............",
    search: "..####......|.#....#.....|#......#....|#......#....|#......#....|#......#....|.#....#.....|..#####.....|.......##...|........##..|.........##.|..........#.",
    feather: ".........###|.......####.|......####..|.....####...|....####....|...####.....|...###......|..#.#.......|..#.........|.#..........|#...........|............",
    star: ".....##.....|.....##.....|....####....|############|.##########.|..########..|...######...|..###..###..|..##....##..|.##......##.|............|............",
    shield: ".##########.|.##########.|.##########.|.##########.|.##########.|.##########.|..########..|..########..|...######...|....####....|.....##.....|............",
    hand: "....#.#.....|...#.#.#.#..|...#.#.#.#..|...#.#.#.#..|.#.#######..|.##########.|..#########.|..#########.|...#######..|...#######..|....#####...|............",
    note: "....#######.|....#######.|....#.....#.|....#.....#.|....#.....#.|....#.....#.|..###...###.|.####..####.|.####..####.|..##....##..|............|............",
    paw: "...##..##...|...##..##...|.##......##.|.##......##.|.....##.....|...######...|..########..|..########..|...######...|............|............|............",
    zz: ".######.....|.....##.....|....##......|...##.......|..##........|.######.####|.........##.|........##..|.......##...|......####..|............|............",
    neuron: ".#........#.|..#......#..|...#....#...|....####....|...######...|#.########.#|...######...|....####....|...#....#...|..#......#..|.#........#.|............",
    bang: ".....##.....|.....##.....|.....##.....|.....##.....|.....##.....|.....##.....|............|.....##.....|.....##.....|............|............|............",
    ask: "...#####....|..##...##...|.......##...|......##....|.....##.....|.....##.....|............|.....##.....|.....##.....|............|............|............",
    dot: "............|............|............|............|....####....|....####....|....####....|....####....|............|............|............|............",
  };
  (function buildIcons() {
    const defs = document.querySelector(".icon-definitions defs");
    if (!defs) return;
    let out = "";
    for (const [name, rows] of Object.entries(ICONS)) {
      let d = "";
      rows.split("|").forEach((row, y) => {
        let x = 0;
        while (x < row.length) {
          if (row[x] === "#") {
            let w = 1;
            while (row[x + w] === "#") w++;
            d += "M" + x + " " + y + "h" + w + "v1h-" + w + "z";
            x += w;
          } else x++;
        }
      });
      out += '<symbol id="i-' + name + '" viewBox="0 0 12 12"><path d="' + d + '"/></symbol>';
    }
    defs.innerHTML = out;
  })();
  function pixelSvg(rows, w, h) {
    let d = "";
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        if (row[x] === "#") {
          let n = 1;
          while (row[x + n] === "#") n++;
          d += "M" + x + " " + y + "h" + n + "v1h-" + n + "z";
          x += n;
        } else x++;
      }
    });
    return '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none"><path fill="currentColor" d="' + d + '"/></svg>';
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
      pets: ["듀이", "셸리", "피치", "액시"].map((name, type) => ({
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
      localStorage.getItem("hatchmind-garden-v3") || "null",
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
      localStorage.setItem("hatchmind-garden-v3", JSON.stringify(state));
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
  /* =========================================================
     커넥톰 학습 (FlyWire 서브그래프를 줄인 데모 회로)
     감각 5 → 중추 3 → 행동 4. 상호작용 = 감각 입력, 결과 보상으로 헤비안 학습.
     ========================================================= */
  const SENSES = [
    { name: "기계감각", verb: "pat" },
    { name: "미각", verb: "feed" },
    { name: "시각", verb: "play" },
    { name: "청각", verb: "call" },
    { name: "후각", verb: "walk" },
  ];
  const HUBS = [
    { name: "버섯체", sub: "학습·기억" },
    { name: "측뿔", sub: "본능" },
    { name: "중심복합체", sub: "이동·방향" },
  ];
  const OUTS = [
    { name: "둘러보기", tem: "탐색", color: "#8eb2b4" },
    { name: "멈칫", tem: "경계", color: "#a7bba5" },
    { name: "다가가기", tem: "친화", color: "#d5afbf" },
    { name: "혼자 있기", tem: "독립", color: "#b2aec4" },
  ];
  const VERBS = [
    { a: "pat", icon: "hand", title: "쓰다듬기", sense: 0, c: "#d5afbf" },
    { a: "feed", icon: "carrot", title: "먹이 주기", sense: 1, c: "#d9b48f" },
    { a: "play", icon: "star", title: "함께 놀기", sense: 2, c: "#8eb2b4" },
    { a: "call", icon: "note", title: "이름 부르기", sense: 3, c: "#a99ccb" },
    { a: "walk", icon: "paw", title: "산책 가기", sense: 4, c: "#a7bba5" },
    { a: "rest", icon: "zz", title: "재우기", sense: -1, c: "#9fa8c9" },
  ];
  function seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  function hashStr(t) {
    let h = 2166136261;
    for (const ch of String(t)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  function brainOf(p) {
    if (p.brain && p.brain.W1) return p.brain;
    const rnd = seeded(hashStr(p.id));
    const W1 = SENSES.map(() => HUBS.map(() => r2(0.25 + rnd() * 0.35)));
    const W2 = HUBS.map((_, j) =>
      OUTS.map((_, k) => r2(0.2 + rnd() * 0.2 + (k === p.type ? 0.3 : 0) + (j === 2 && (k === 0 || k === 3) ? 0.08 : 0) + (j === 1 && k === 1 ? 0.08 : 0))),
    );
    p.brain = { W1, W2, n: 0, dw: 0, log: [], last: null };
    p.brain.base = temper(p.brain);
    return p.brain;
  }
  function temper(b) {
    const s = OUTS.map((_, k) => b.W2.reduce((a, row) => a + row[k], 0));
    const t = s.reduce((a, v) => a + v, 0) || 1;
    return s.map((v) => Math.round((v / t) * 100));
  }
  function stimulate(p, si) {
    const b = brainOf(p);
    const h = b.W1[si].map((w) => w * (0.85 + Math.random() * 0.3));
    const o = OUTS.map((_, k) => h.reduce((a, hj, j) => a + hj * b.W2[j][k], 0));
    o[2] += (p.stats.friendship - 50) / 260;
    o[3] += (40 - p.stats.energy) / 200;
    o[1] += (35 - p.stats.friendship) / 160;
    const T = 0.14;
    const mx = Math.max(...o);
    const e = o.map((v) => Math.exp((v - mx) / T));
    const z = e.reduce((a, v) => a + v, 0);
    let r = Math.random() * z,
      k = 0;
    while (k < 3 && (r -= e[k]) > 0) k++;
    return { si, h, o, k };
  }
  function learn(p, res, reward) {
    const b = brainOf(p),
      lr = 0.09;
    let sum = 0,
      jmax = 0;
    res.h.forEach((hj, j) => {
      if (hj > res.h[jmax]) jmax = j;
      const d1 = lr * reward * hj,
        d2 = lr * reward * hj * 0.8;
      b.W1[res.si][j] = r2(Math.max(0.05, Math.min(1.5, b.W1[res.si][j] + d1)));
      b.W2[j][res.k] = r2(Math.max(0.05, Math.min(1.5, b.W2[j][res.k] + d2)));
      sum += d1 + d2;
    });
    b.n++;
    b.dw = r2(b.dw + Math.abs(sum));
    b.last = { si: res.si, k: res.k, o: res.o.map(r2), j: jmax };
    b.log.unshift({
      t: SENSES[res.si].name + " → " + HUBS[jmax].name + " → " + OUTS[res.k].name,
      d: (sum >= 0 ? "▲" : "▼") + Math.abs(sum).toFixed(2),
      si: res.si, j: jmax, k: res.k, sum: r2(sum),
      at: Date.now(),
    });
    b.log = b.log.slice(0, 8);
  }
  function consolidate(p) {
    const b = brainOf(p);
    const recent = b.log.filter((l) => l.si !== undefined && l.si >= 0).slice(0, 3);
    recent.forEach((l) => {
      const d = l.sum * 0.25;
      b.W1[l.si][l.j] = r2(Math.max(0.05, Math.min(1.5, b.W1[l.si][l.j] + d)));
      b.W2[l.j][l.k] = r2(Math.max(0.05, Math.min(1.5, b.W2[l.j][l.k] + d)));
    });
    b.log.unshift({ t: "자는 동안 기억 정리 · 최근 연결 " + recent.length + "개 다시 강화", d: "↺", at: Date.now() });
    b.log = b.log.slice(0, 8);
  }
  function rewardFor(verb, p) {
    const s = p.stats;
    return {
      pat: s.friendship > 35 ? 0.6 : 0.15,
      feed: (100 - s.food) / 100 - 0.15,
      play: s.energy > 30 ? 0.7 : -0.35,
      call: 0.35 + (s.friendship > 60 ? 0.2 : 0),
      walk: s.energy > 25 ? 0.65 : -0.25,
    }[verb];
  }

  /* 회로 SVG */
  const BX = { in: 78, hub: 196, out: 306 };
  const inY = (i) => 26 + i * 40,
    hubY = (j) => 46 + j * 60,
    outY = (k) => 36 + k * 50;
  function brainSvg(p) {
    const b = brainOf(p),
      last = b.last;
    let s =
      '<svg class="brain-svg" id="brain" viewBox="0 0 380 210" role="img" aria-label="감각에서 행동으로 이어지는 학습 회로">' +
      '<text class="col" x="78" y="10" text-anchor="middle">감각</text><text class="col" x="196" y="12" text-anchor="middle">중추</text><text class="col" x="306" y="12" text-anchor="middle">행동</text>';
    SENSES.forEach((_, i) =>
      HUBS.forEach((_, j) => {
        const w = b.W1[i][j];
        s += '<line class="b-edge" id="e1-' + i + "-" + j + '" x1="' + (BX.in + 12) + '" y1="' + inY(i) + '" x2="' + (BX.hub - 12) + '" y2="' + hubY(j) + '" stroke-width="' + Math.max(1, Math.round(w * 4)) + '"/>';
      }),
    );
    HUBS.forEach((_, j) =>
      OUTS.forEach((_, k) => {
        const w = b.W2[j][k];
        s += '<line class="b-edge" id="e2-' + j + "-" + k + '" x1="' + (BX.hub + 12) + '" y1="' + hubY(j) + '" x2="' + (BX.out - 12) + '" y2="' + outY(k) + '" stroke-width="' + Math.max(1, Math.round(w * 4)) + '"/>';
      }),
    );
    SENSES.forEach((sn, i) => {
      s += '<g class="b-node" id="n-in-' + i + '" style="--c:#a99ccb"><rect class="box" x="' + (BX.in - 10) + '" y="' + (inY(i) - 10) + '" width="20" height="20"/><text x="' + (BX.in - 16) + '" y="' + (inY(i) + 4) + '" text-anchor="end">' + sn.name + "</text></g>";
    });
    HUBS.forEach((hb, j) => {
      s += '<g class="b-node" id="n-hub-' + j + '" style="--c:#8eb2b4"><rect class="box" x="' + (BX.hub - 12) + '" y="' + (hubY(j) - 12) + '" width="24" height="24"/><text x="' + BX.hub + '" y="' + (hubY(j) + 25) + '" text-anchor="middle">' + hb.name + '</text><text class="sub" x="' + BX.hub + '" y="' + (hubY(j) + 36) + '" text-anchor="middle">' + hb.sub + "</text></g>";
    });
    const mx = last ? Math.max(...last.o) : 1;
    OUTS.forEach((o, k) => {
      const lv = last ? Math.max(2, Math.round((last.o[k] / mx) * 16)) : 0;
      s += '<g class="b-node' + (last && last.k === k ? " win" : "") + '" id="n-out-' + k + '" style="--c:' + o.color + '"><rect class="box" x="' + (BX.out - 10) + '" y="' + (outY(k) - 10) + '" width="20" height="20"/>' +
        (lv ? '<rect class="lvl" x="' + (BX.out - 8) + '" y="' + (outY(k) + 8 - lv) + '" width="16" height="' + lv + '"/>' : "") +
        '<text x="' + (BX.out + 16) + '" y="' + (outY(k) + 4) + '">' + o.name + "</text></g>";
    });
    return s + '<g id="pulses"></g></svg>';
  }
  function firePulse(si, k) {
    return new Promise((done) => {
      const svg = $("#brain");
      if (!svg || matchMedia("(prefers-reduced-motion: reduce)").matches) return done();
      const ns = "http://www.w3.org/2000/svg",
        g = svg.querySelector("#pulses");
      const hot = [];
      const mark = (el) => el && (el.classList.add(el.tagName === "line" ? "hot" : "fire"), hot.push(el));
      mark(svg.querySelector("#n-in-" + si));
      const legs = [];
      HUBS.forEach((_, j) => {
        legs.push({ a: [BX.in + 12, inY(si)], b: [BX.hub - 12, hubY(j)], t0: 0, el: svg.querySelector("#e1-" + si + "-" + j), node: svg.querySelector("#n-hub-" + j) });
        legs.push({ a: [BX.hub + 12, hubY(j)], b: [BX.out - 12, outY(k)], t0: 0.5, el: svg.querySelector("#e2-" + j + "-" + k), node: svg.querySelector("#n-out-" + k) });
      });
      const dots = legs.map(() => {
        const r = document.createElementNS(ns, "rect");
        r.setAttribute("width", 6);
        r.setAttribute("height", 6);
        r.setAttribute("class", "b-pulse");
        r.style.display = "none";
        g.append(r);
        return r;
      });
      const start = performance.now(),
        D = 1100;
      (function frame(now) {
        const t = Math.min(1, (now - start) / D);
        legs.forEach((L, i) => {
          const u = (t - L.t0) / 0.5;
          if (u >= 0 && u <= 1) {
            if (!L.on) { L.on = 1; mark(L.el); }
            const q = Math.floor(u * 8) / 8;
            const x = L.a[0] + (L.b[0] - L.a[0]) * q,
              y = L.a[1] + (L.b[1] - L.a[1]) * q;
            dots[i].style.display = "";
            dots[i].setAttribute("x", Math.round(x / 2) * 2 - 3);
            dots[i].setAttribute("y", Math.round(y / 2) * 2 - 3);
          } else {
            dots[i].style.display = "none";
            if (u > 1 && !L.reached) { L.reached = 1; mark(L.node); }
          }
        });
        if (t < 1) requestAnimationFrame(frame);
        else {
          dots.forEach((d) => d.remove());
          setTimeout(() => { hot.forEach((el) => el.classList.remove("hot", "fire")); done(); }, 160);
        }
      })(start);
    });
  }
  function brainPanel(p) {
    const b = brainOf(p),
      t = temper(b);
    const last = b.last;
    return (
      '<div class="brain-head"><div><h2>' + icon("neuron") + "커넥톰 학습</h2><p>상호작용이 감각 입력이 되어 " + esc(p.name) + "의 회로 가중치를 바꿔요.</p></div>" +
      '<span class="brain-count">학습 ' + b.n + "회</span></div>" +
      brainSvg(p) +
      '<div class="reaction" id="reaction">' + icon(last ? "spark" : "ask") +
      (last
        ? "<span>마지막 반응: <b>" + OUTS[last.k].name + "</b> · " + SENSES[last.si].name + " 입력에서 " + HUBS[last.j].name + " 경로가 가장 강했어요.</span>"
        : "<span>아래 버튼으로 말을 걸면 어떤 경로로 반응하는지 보여요.</span>") +
      "</div>" +
      '<div class="temper"><div class="temper-title"><span>학습된 기질</span><small>세로선 = 처음 상태</small></div>' +
      OUTS.map((o, k) => {
        const d = t[k] - b.base[k];
        return '<div class="tm" style="--c:' + o.color + '"><span>' + o.tem + '</span><span class="bar"><i style="width:' + Math.min(100, t[k] * 2) + '%"></i><u style="left:' + Math.min(100, b.base[k] * 2) + '%"></u></span><em class="' + (d > 0 ? "up" : d < 0 ? "down" : "") + '">' + t[k] + "%" + (d ? (d > 0 ? " +" : " ") + d : "") + "</em></div>";
      }).join("") +
      "</div>" +
      '<div><div class="learn-title"><span>시냅스 변화 기록</span><small>누적 Σ' + b.dw.toFixed(2) + '</small></div><ul class="learn-log">' +
      (b.log.length
        ? b.log.slice(0, 3).map((l) => "<li><span>" + esc(l.t) + "</span><span>" + l.d + "</span></li>").join("")
        : '<li><span>아직 학습 기록이 없어요.</span><span></span></li>') +
      "</ul></div>" +
      '<p class="brain-note">FlyWire 초파리 커넥톰(FAFB v783)의 감각→중추→행동 경로를 12개 노드로 줄인 체험용 회로예요. 진화 갈래도 이 기질로 정해져요.</p>'
    );
  }

  /* =========================================================
     홈 화면
     ========================================================= */
  function needs(p) {
    return [
      ["포만감", p.stats.food, "#d9b48f"],
      ["에너지", p.stats.energy, "#8eb2b4"],
      ["친밀도", p.stats.friendship, "#d5afbf"],
    ]
      .map(([label, n, c]) => {
        const on = Math.round(clamp(n) / 10);
        return '<div class="need" style="--c:' + c + '"><span>' + label + '</span><span class="blocks">' + Array.from({ length: 10 }, (_, i) => "<i" + (i < on ? ' class="on"' : "") + "></i>").join("") + "</span><b>" + Math.round(n) + "</b></div>";
      })
      .join("");
  }
  function hud(p) {
    const own = p.owner === state.wallet;
    return (
      '<div class="hud-plate"><strong>' + esc(p.name) + "<span>" + stageNames[p.stage] + "</span></strong><p>" + types[p.type].name + " · " + (p.owner === "escrow" ? "선물 보관 중" : own ? "내 뉴로링" : p.owner + "의 뉴로링") + "</p></div>" +
      '<div class="hud-needs">' + needs(p) + "</div>"
    );
  }
  function verbBar(p) {
    const own = p.owner === state.wallet;
    return VERBS.map((v, i) => {
      const off = !own || (p.stage === 0 && v.a !== "pat");
      const sub = v.sense >= 0 ? SENSES[v.sense].name : "기억 정리";
      return '<button class="verb" data-action="' + v.a + '" style="--c:' + v.c + '" ' + (off ? "disabled" : "") + "><kbd>" + (i + 1) + '</kbd><span class="vi">' + icon(v.icon) + "</span><strong>" + v.title + "</strong><small>" + (v.a === "feed" ? "당근 " + state.food + " · " : "") + sub + "</small></button>";
    }).join("");
  }
  function stripCard(q) {
    const own = q.owner === state.wallet;
    return '<button class="strip-card ' + (q.id === state.selected ? "selected " : "") + (own ? "" : "other") + '" data-action="select" data-pet="' + esc(q.id) + '">' + (own ? '<span class="mine-flag">내 친구</span>' : "") + petSprite(q) + "<strong>" + esc(q.name) + "</strong><small>" + types[q.type].name + " · " + stageNames[q.stage] + "</small></button>";
  }
  function growPanel(p) {
    const own = p.owner === state.wallet,
      seconds = Math.max(0, Math.ceil((p.changedAt + 3000 - Date.now()) / 1000));
    const label = p.stage === 3 ? "진화 완료" : seconds > 0 ? seconds + "초 후 성장" : p.stage === 0 ? "부화시키기" : "성장하기";
    return (
      '<section class="panel grow-panel"><h3>' + esc(p.name) + "의 성장</h3><p>" +
      (p.stage === 2 ? "다음 진화 갈래는 학습된 기질로 정해져요." : p.stage === 0 ? "알을 쓰다듬어 따뜻하게 해 주세요." : "한 단계씩 자라요. 체험용이라 3초면 돼요.") +
      "</p>" + growthSteps(p) +
      '<button class="grow-btn" data-action="grow" ' + (!own || p.stage === 3 ? "disabled" : "") + ">" + esc(label) + icon("arrow") + "</button></section>"
    );
  }
  function home() {
    const p = selected();
    const list = [...state.pets.filter((q) => q.owner === state.wallet), ...state.pets.filter((q) => q.owner !== state.wallet && q.owner !== "escrow")];
    return (
      '<div class="home2">' +
      '<section class="panel stage-panel" id="stage-panel"><div class="stage" id="stage">' +
      '<div class="stars" id="stars"></div><div class="sky-orb">' + skyOrb() + "</div>" +
      '<span class="cloud" style="top:64px">' + cloudSvg() + '</span><span class="cloud c2">' + cloudSvg() + "</span>" +
      '<div class="layer far" id="layer-far"></div><div class="layer near" id="layer-near"></div><div class="mist"></div>' +
      '<div class="ground"></div><div class="ground-deco" id="ground-deco"></div><div class="motes" id="motes"></div>' +
      '<div class="hud" id="hud">' + hud(p) + "</div>" +
      '<span class="stage-hint">' + icon("hand") + " " + esc(p.name) + "를 눌러 쓰다듬어요</span>" +
      '<span class="stage-clock">' + icon(state.night ? "moon" : "sun") + " " + new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" }) + "</span>" +
      "</div>" +
      '<div class="verbs" id="verbs">' + verbBar(p) + "</div></section>" +
      '<aside class="panel brain-panel" id="brain-panel">' + brainPanel(p) + "</aside></div>" +
      '<div class="pet-strip"><section><div class="section-title"><h2>뉴로링 <span>' + list.length + '</span></h2><a href="#collection" class="text-link">모두 보기 ' + icon("arrow") + '</a></div><div class="strip-list" id="strip-list">' +
      list.slice(0, 8).map(stripCard).join("") +
      '</div></section><div id="grow-slot">' + growPanel(p) + "</div></div>"
    );
  }
  function refreshHome() {
    if (route !== "home") return;
    const p = selected();
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    set("hud", hud(p));
    set("verbs", verbBar(p));
    set("brain-panel", brainPanel(p));
    set("grow-slot", growPanel(p));
  }

  /* 풍경 레이어 (도트 SVG, 이음새 없이 반복) */
  function skyOrb() {
    return pixelSvg([
      "....####....", "..########..", ".##########.", ".##########.", "############", "############",
      "############", "############", ".##########.", ".##########.", "..########..", "....####....",
    ], 12, 12);
  }
  function cloudSvg() {
    return pixelSvg(["......####......", "...##########...", ".##############.", "################", ".##############."], 16, 5);
  }
  function hillsUrl(tileW, tileH, color, amp, base, waves, seed, extra) {
    const u = 4, cols = tileW / u, rows = tileH / u, rnd = seeded(seed);
    const ph = waves.map(() => rnd() * Math.PI * 2);
    let d = "";
    for (let x = 0; x < cols; x++) {
      let h = base;
      waves.forEach((w, i) => (h += amp[i] * Math.sin((x / cols) * Math.PI * 2 * w + ph[i])));
      h = Math.max(1, Math.min(rows, Math.round(h)));
      d += "M" + x + " " + (rows - h) + "h1v" + h + "h-1z";
    }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + tileW + '" height="' + tileH + '" viewBox="0 0 ' + cols + " " + rows + '" shape-rendering="crispEdges"><path fill="' + color + '" d="' + d + '"/>' + (extra || "") + "</svg>";
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  function decoUrl(seed, cs) {
    const W = 960, H = 96, u = 4, cols = W / u, rnd = seeded(seed);
    let s = "";
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(rnd() * (cols - 4)), y = 6 + Math.floor(rnd() * 14), kind = rnd();
      if (kind < 0.55) s += '<path fill="' + cs.grass2 + '" d="M' + x + " " + (y - 2) + "h1v2h-1zM" + (x + 2) + " " + (y - 3) + "h1v3h-1zM" + (x + 1) + " " + (y - 1) + 'h1v1h-1z"/>';
      else {
        const c = [cs.rose, cs.butter, "#ffffff", cs.lilac][Math.floor(rnd() * 4)];
        s += '<path fill="' + cs.grass2 + '" d="M' + (x + 1) + " " + (y - 2) + 'h1v2h-1z"/><path fill="' + c + '" d="M' + x + " " + (y - 4) + "h3v1h-3zM" + (x + 1) + " " + (y - 5) + "h1v3h-1z" + '"/>';
      }
    }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + cols + " " + H / u + '" shape-rendering="crispEdges">' + s + "</svg>";
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  function paintScenery() {
    const cs0 = getComputedStyle(document.body), v = (n) => cs0.getPropertyValue(n).trim();
    const cs = { far: v("--hill-far"), near: v("--hill-near"), grass2: v("--grass-2"), rose: v("--rose"), butter: v("--butter"), lilac: v("--lilac") };
    const far = $("#layer-far"), near = $("#layer-near"), deco = $("#ground-deco");
    if (far) far.style.backgroundImage = hillsUrl(240, 112, cs.far, [5, 3], 14, [1, 3], 7);
    if (near) near.style.backgroundImage = hillsUrl(480, 80, cs.near, [3, 2], 8, [2, 5], 21);
    if (deco) deco.style.backgroundImage = decoUrl(5, cs);
    const stars = $("#stars");
    if (stars && !stars.childElementCount) {
      const rnd = seeded(99);
      stars.innerHTML = Array.from({ length: 22 }, () => '<i style="left:' + Math.round(rnd() * 98) + "%;top:" + Math.round(rnd() * 90) + "%;animation-delay:-" + (rnd() * 3).toFixed(1) + 's"></i>').join("");
    }
    const motes = $("#motes");
    if (motes && !motes.childElementCount) {
      const rnd = seeded(3);
      motes.innerHTML = Array.from({ length: 12 }, () => '<i style="left:' + Math.round(rnd() * 100) + "%;animation-delay:-" + (rnd() * 9).toFixed(1) + "s;animation-duration:" + (7 + rnd() * 6).toFixed(1) + 's"></i>').join("");
    }
  }

  /* =========================================================
     무대 컨트롤러: 인사 · 배회 · 산책 · 깜빡임 · 반응
     ========================================================= */
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stg = { x: 50, dir: 1, gen: 0, busy: false, greeted: new Set(), petId: null, strollCount: 0 };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function petEl() { return $("#pet"); }
  function setFrame(kind) {
    const p = selected(), el = $("#pet img");
    if (!el) return;
    const n = spriteName(p), info = PX[n];
    const suf = kind && info && info.blink ? "-" + kind : "";
    el.src = "assets/px/" + n + suf + ".png";
  }
  function face(dir) {
    const p = selected(), info = PX[spriteName(p)];
    stg.dir = dir;
    const flip = $("#pet .pet-flip");
    if (!flip || !info || !info.face) return;
    flip.classList.toggle("left", dir * info.face < 0);
  }
  function body(cls) {
    const b = $("#pet .pet-body");
    if (!b) return;
    const p = selected();
    b.className = "pet-body " + (cls || (p.stage === 0 ? "egg" : ""));
  }
  function say(text, ms = 2600) {
    const sp = $("#speech");
    if (!sp) return;
    sp.hidden = false;
    sp.textContent = text;
    sp.style.animation = "none";
    void sp.offsetWidth;
    sp.style.animation = "";
    clearTimeout(stg.sayT);
    stg.sayT = setTimeout(() => (sp.hidden = true), ms);
  }
  function fx(kind, n = 3) {
    const stage = $("#stage"), pet = petEl();
    if (!stage || !pet || reduce()) return;
    const sr = stage.getBoundingClientRect(), pr = pet.getBoundingClientRect();
    const map = { heart: "heart", note: "note", food: "carrot", spark: "spark", zz: "zz", alert: null, ask: null };
    for (let i = 0; i < n; i++) {
      const e = document.createElement("span");
      e.className = "fx " + kind;
      e.innerHTML = kind === "alert" ? "!" : kind === "ask" ? "?" : icon(map[kind] || "spark");
      e.style.left = Math.round(pr.left - sr.left + pr.width * (0.3 + Math.random() * 0.4)) + "px";
      e.style.top = Math.round(pr.top - sr.top + pr.height * 0.15) + "px";
      e.style.setProperty("--dx", Math.round((Math.random() - 0.5) * 40) + "px");
      e.style.animationDelay = i * 0.18 + "s";
      stage.append(e);
      setTimeout(() => e.remove(), 1600 + i * 180);
    }
  }
  async function moveTo(x, gen, speed = 0.15) {
    const pet = petEl();
    if (!pet || gen !== stg.gen) return;
    const dist = Math.abs(x - stg.x);
    if (dist < 1) return;
    face(x > stg.x ? 1 : -1);
    const ms = reduce() ? 0 : Math.round(dist / speed * 10);
    body("hop");
    pet.style.transition = "left " + ms + "ms linear";
    pet.style.left = x + "%";
    stg.x = x;
    await wait(ms + 30);
    if (gen === stg.gen) body();
  }
  function greetLine(p) {
    const h = new Date().getHours(), w = state.wallet;
    if (p.stage === 0) return "(따뜻해…) 알이 살짝 흔들려요.";
    if (p.stats.food < 35) return "왔어요? 배가 조금 고파요…";
    if (p.stats.energy < 30) return "어서 와요… 조금 졸려요.";
    if (h < 6 || h >= 22) return "이 시간에 와 줬네요, " + w + "!";
    if (h < 11) return "좋은 아침이에요, " + w + "!";
    if (p.stats.friendship > 75) return "기다리고 있었어요, " + w + "!";
    return "어서 와요, " + w + "!";
  }
  async function greet(gen) {
    const p = selected();
    if (p.stage === 0) { say(greetLine(p)); return; }
    const pet = petEl();
    if (!reduce() && pet) {
      pet.style.transition = "none";
      stg.x = -12;
      pet.style.left = "-12%";
      void pet.offsetWidth;
      await moveTo(50, gen, 0.25);
    }
    if (gen !== stg.gen) return;
    face(1);
    setFrame("happy");
    body("jump");
    fx("heart", 3);
    say(greetLine(p), 3200);
    chirp();
    await wait(1200);
    if (gen !== stg.gen) return;
    setFrame();
    body();
  }
  async function stroll(gen, byUser) {
    const p = selected(), stage = $("#stage");
    if (!stage || p.stage === 0) return;
    await moveTo(46, gen);
    if (gen !== stg.gen) return;
    face(1);
    say(byUser ? "산책이다! 같이 가요!" : "잠깐 바깥 냄새 맡고 올게요.", 2200);
    body("hop");
    stage.classList.add("strolling");
    await wait(reduce() ? 300 : 5200);
    stage.classList.remove("strolling");
    if (gen !== stg.gen) return;
    body();
    setFrame("happy");
    const found = Math.random() < (byUser ? 0.6 : 0.35);
    if (found) {
      state.food = Math.min(99, state.food + 1);
      save();
      fx("food", 1);
      say("산책하다 당근을 주웠어요!", 2600);
      refreshHome();
    } else if (!byUser) say("다녀왔어요. 꽃 냄새가 났어요.", 2400);
    await wait(900);
    if (gen === stg.gen) setFrame();
  }
  async function idleLoop(gen) {
    while (gen === stg.gen) {
      await wait(7000 + Math.random() * 7000);
      if (gen !== stg.gen) return;
      if (stg.busy || route !== "home" || document.hidden) continue;
      const p = selected();
      if (p.stage === 0) { body("wiggle"); await wait(1100); if (gen === stg.gen) body(); continue; }
      stg.busy = true;
      const r = Math.random();
      stg.strollCount++;
      if (stg.strollCount % 4 === 0) await stroll(gen, false);
      else if (r < 0.55) await moveTo(18 + Math.random() * 64, gen, 0.1);
      else if (r < 0.75) {
        face(-stg.dir); await wait(700);
        if (gen === stg.gen) face(-stg.dir); await wait(500);
      } else if (r < 0.88) { body("jump"); await wait(1100); if (gen === stg.gen) body(); }
      else say(types[p.type].speech, 2400);
      stg.busy = false;
    }
  }
  async function blinkLoop(gen) {
    while (gen === stg.gen) {
      await wait(2200 + Math.random() * 3200);
      if (gen !== stg.gen) return;
      const img = $("#pet img");
      if (!img || stg.busy || /-(happy|blink)\.png$/.test(img.src) || $("#pet .pet-body.sleep")) continue;
      setFrame("blink");
      await wait(130);
      if (gen === stg.gen && /-blink\.png$/.test(($("#pet img") || {}).src || "")) setFrame();
    }
  }
  function mountStage() {
    const stage = $("#stage");
    if (!stage) return;
    stg.gen++;
    const gen = stg.gen, p = selected(), n = spriteName(p), info = PX[n] || { w: 300 };
    paintScenery();
    if (stg.petId !== p.id) { stg.x = 50; stg.petId = p.id; }
    const wrap = document.createElement("div");
    wrap.className = "pet";
    wrap.id = "pet";
    wrap.style.left = stg.x + "%";
    wrap.setAttribute("role", "button");
    wrap.setAttribute("tabindex", "-1");
    wrap.setAttribute("aria-label", p.name + " 쓰다듬기");
    wrap.dataset.action = "pat";
    wrap.innerHTML = '<div class="speech" id="speech" hidden></div><div class="pet-flip"><div class="pet-body" style="--w:' + info.w + '">' + petSprite(p) + '</div></div><div class="pet-shadow"></div>';
    stage.append(wrap);
    body();
    face(stg.dir);
    ["", "-blink", "-happy"].forEach((s) => { if (PX[n] && (s === "" || PX[n].blink)) new Image().src = "assets/px/" + n + s + ".png"; });
    const key = state.wallet + ":" + p.id;
    stg.busy = false;
    if (!stg.greeted.has(key)) {
      stg.greeted.add(key);
      stg.busy = true;
      greet(gen).then(() => { if (gen === stg.gen) stg.busy = false; });
    }
    idleLoop(gen);
    blinkLoop(gen);
  }

  /* 상호작용 → 회로 → 반응 */
  const LINES = {
    pat: ["…가만히 볼게요.", "거긴 조금 낯설어요…", "헤헤, 간지러워요!", "응, 고마워. 이제 됐어요."],
    feed: ["이건 무슨 맛이지?", "냄새부터 맡아볼게요…", "냠냠, 맛있어요!", "나중에 혼자 먹을래요."],
    play: ["저쪽엔 뭐가 있을까?", "너무 빨라요…!", "한 번 더, 한 번 더!", "혼자 굴려 볼래요."],
    call: ["누가 불렀지? 어디지?", "…! 깜짝이야.", "네! 여기 있어요!", "…들었어요. 조금 이따가요."],
    walk: ["처음 맡는 냄새예요!", "낯선 길은 천천히 갈래요.", "같이 걸어서 좋아요!", "제 길로 가 볼게요."],
  };
  async function react(verb, k, gen) {
    const p = selected();
    const line = LINES[verb][[0, 1, 2, 3][k]];
    if (verb === "walk") {
      await stroll(gen, true);
      if (gen === stg.gen) say(line, 2400);
      return;
    }
    if (k === 2) {
      await moveTo(Math.max(30, Math.min(70, 50 + (Math.random() - 0.5) * 16)), gen, 0.22);
      if (gen !== stg.gen) return;
      setFrame("happy");
      body(verb === "feed" ? "munch" : "jump");
      fx(verb === "feed" ? "food" : verb === "call" ? "note" : "heart", 3);
    } else if (k === 0) {
      fx("ask", 1);
      face(-stg.dir); await wait(500);
      if (gen !== stg.gen) return;
      face(-stg.dir);
      await moveTo(Math.max(15, Math.min(85, stg.x + (Math.random() < 0.5 ? -18 : 18))), gen, 0.18);
      if (verb === "feed") body("munch");
    } else if (k === 1) {
      fx("alert", 1);
      body("flinch");
    } else {
      face(-stg.dir);
      await moveTo(Math.max(14, Math.min(86, stg.x + stg.dir * 16)), gen, 0.12);
      if (verb === "feed") body("munch");
    }
    if (gen !== stg.gen) return;
    say(line, 2600);
    await wait(1300);
    if (gen !== stg.gen) return;
    setFrame();
    body();
  }
  async function interact(verb) {
    const p = selected();
    if (route !== "home") navigate("home");
    if (p.owner !== state.wallet) return toast("다른 지갑의 뉴로링이에요. 내 뉴로링을 골라 주세요.");
    if (p.stage === 0 && verb !== "pat") return toast("알이 부화하면 함께 할 수 있어요.");
    if (stg.busy) return;
    const gen = stg.gen;
    if (p.stage === 0) {
      body("wiggle");
      fx("heart", 2);
      say("(알이 따뜻해졌어요)", 1800);
      p.stats.friendship = clamp(p.stats.friendship + 2);
      save();
      refreshHome();
      setTimeout(() => gen === stg.gen && body(), 1100);
      return;
    }
    if (verb === "feed" && state.food < 1) return toast("당근이 없어요. 재우거나 산책하면 다시 모여요.");
    if ((verb === "play" || verb === "walk") && p.stats.energy < 8) {
      say("너무 피곤해요…", 1800);
      return toast("에너지가 부족해요. 먼저 재워 주세요.");
    }
    stg.busy = true;
    $("#stage-panel")?.classList.add("busy");
    try {
      if (verb === "rest") {
        await moveTo(50, gen);
        if (gen !== stg.gen) return;
        setFrame("blink");
        body("sleep");
        say("쿨… 쿨…", 2000);
        fx("zz", 3);
        p.stats.energy = clamp(p.stats.energy + 20);
        p.stats.friendship = clamp(p.stats.friendship + 2);
        p.rests = (p.rests || 0) + 1;
        state.food = Math.min(99, state.food + 2);
        consolidate(p);
        addLog(p.name + ": 휴식 · 기억 정리, 당근 +2");
        save();
        refreshHome();
        chirp();
        await wait(reduce() ? 300 : 2600);
        if (gen === stg.gen) { setFrame("happy"); body("jump"); say("푹 잤어요!", 1800); await wait(1100); if (gen === stg.gen) { setFrame(); body(); } }
        return;
      }
      const v = VERBS.find((x) => x.a === verb);
      body("wiggle");
      const res = stimulate(p, v.sense);
      await firePulse(v.sense, res.k);
      if (gen !== stg.gen) return;
      const reward = rewardFor(verb, p) + (res.k === 2 ? 0.1 : 0);
      if (verb === "pat") { p.stats.friendship = clamp(p.stats.friendship + (res.k === 1 ? 1 : 4)); p.pats = (p.pats || 0) + 1; }
      if (verb === "feed") { state.food--; p.stats.food = clamp(p.stats.food + 14); p.stats.friendship = clamp(p.stats.friendship + 2); p.feeds = (p.feeds || 0) + 1; }
      if (verb === "play") { p.stats.energy = clamp(p.stats.energy - 8); p.stats.friendship = clamp(p.stats.friendship + 6); p.plays = (p.plays || 0) + 1; }
      if (verb === "call") { p.stats.friendship = clamp(p.stats.friendship + 2); p.calls = (p.calls || 0) + 1; }
      if (verb === "walk") { p.stats.energy = clamp(p.stats.energy - 10); p.stats.food = clamp(p.stats.food - 6); p.stats.friendship = clamp(p.stats.friendship + 5); p.walks = (p.walks || 0) + 1; p.plays = (p.plays || 0) + 1; }
      learn(p, res, reward);
      addLog(p.name + ": " + v.title + " → " + OUTS[res.k].name);
      save();
      refreshHome();
      chirp();
      await react(verb, res.k, gen);
    } finally {
      if (gen === stg.gen) { stg.busy = false; $("#stage-panel")?.classList.remove("busy"); refreshHome(); }
    }
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
        "등록된 모든 뉴로링의 성장 단계와 상태예요.",
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

  const TRAITS = [
    { id: "challenge", kx: 500, ky: 10, name: "도전성", icon: "flag", color: "#e7a76c", x: 500, y: 92,
      rule: "놀기 6회 이상 · 성장기 이상", ok: (p) => (p.plays || 0) >= 6 && p.stage >= 2 },
    { id: "observe", kx: 290, ky: 95, name: "관찰력", icon: "eye", color: "#8fc3b8", x: 360, y: 170,
      rule: "쉬기 3회 이상", ok: (p) => (p.rests || 0) >= 3 },
    { id: "adapt", kx: 710, ky: 95, name: "적응력", icon: "refresh", color: "#9cc7a6", x: 640, y: 170,
      rule: "먹이 3회 · 쉬기 2회 이상", ok: (p) => (p.feeds || 0) >= 3 && (p.rests || 0) >= 2 },
    { id: "curious", kx: 140, ky: 195, name: "호기심", icon: "search", color: "#b9a3d6", x: 235, y: 262,
      rule: "탐색형이거나 놀기 3회 이상", ok: (p) => p.type === 0 || (p.plays || 0) >= 3 },
    { id: "independent", kx: 860, ky: 195, name: "독립성", icon: "feather", color: "#a9b4d9", x: 765, y: 262,
      rule: "독립형이거나 쉬기 5회 이상", ok: (p) => p.type === 3 || (p.rests || 0) >= 5 },
    { id: "outgoing", parent: [235, 262], kx: 50, ky: 265, name: "외향성", icon: "star", color: "#f0c56b", x: 110, y: 350,
      rule: "놀기 4회 · 친밀도 70 이상", ok: (p) => (p.plays || 0) >= 4 && p.stats.friendship >= 70 },
    { id: "friendly", kx: 270, ky: 420, name: "친화성", icon: "heart", color: "#e3a7b0", x: 370, y: 345,
      rule: "친화형이거나 친밀도 80 이상", ok: (p) => p.type === 2 || p.stats.friendship >= 80 },
    { id: "careful", kx: 730, ky: 420, name: "신중함", icon: "shield", color: "#8fa6c8", x: 630, y: 345,
      rule: "신중형이거나 쉬기 4회 이상", ok: (p) => p.type === 1 || (p.rests || 0) >= 4 },
  ];
  function traitTree(p) {
    const J = [500, 430], R = [500, 520];
    const got = TRAITS.map((t) => p.stage > 0 && t.ok(p));
    const curve = (a, b) => "M" + a[0] + " " + a[1] + " Q" + a[0] + " " + (a[1] + b[1]) / 2 + " " + (a[0] + b[0]) / 2 + " " + (a[1] + b[1]) / 2 + " T" + b[0] + " " + b[1];
    let lines = "", kids = "", nodes = "";
    lines += '<path class="tt-line on" d="M' + R[0] + " " + R[1] + " L" + J[0] + " " + J[1] + '"/>';
    TRAITS.forEach((t, i) => {
      const on = got[i];
      lines += '<path class="tt-line ' + (on ? "on" : "") + '" d="' + curve(t.parent || J, [t.x, t.y]) + '"/>';
      lines += '<path class="tt-line locked" d="M' + t.x + " " + t.y + " L" + t.kx + " " + t.ky + '"/>';
      kids += '<g class="tt-kid" transform="translate(' + t.kx + " " + t.ky + ')"><rect x="-17" y="-17" width="34" height="34" rx="9"/><path d="M-4 -1v-3a4 4 0 0 1 8 0v3M-6 -1h12v8h-12z"/></g>';
      nodes += '<g class="tt-node ' + (on ? "on" : "off") + '" transform="translate(' + t.x + " " + t.y + ')" style="--c:' + t.color + '"><title>' + t.name + " · " + t.rule + '</title>' +
        '<rect x="-30" y="-30" width="60" height="60" rx="14" class="tt-shadow"/><rect x="-30" y="-34" width="60" height="60" rx="14" class="tt-box"/>' +
        '<use href="#i-' + t.icon + '" x="-14" y="-18" width="28" height="28" class="tt-icon"/>' +
        (on ? '<g class="tt-badge" transform="translate(24 -32)"><circle r="11"/><path d="M-5 0l3 3 6-6"/></g>' : "") +
        '<g class="tt-label" transform="translate(0 46)"><rect x="-36" y="-14" width="72" height="27" rx="13"/><text y="5">' + t.name + "</text></g></g>";
    });
    const count = got.filter(Boolean).length;
    return (
      '<div class="tt-wrap"><svg class="trait-tree" viewBox="0 -15 1000 605" role="img" aria-label="' + esc(p.name) + "의 성향 트리, " + count + "개 획득\">" +
      '<g class="tt-lines">' + lines + "</g>" + kids + nodes +
      '<rect class="tt-junction" x="' + (J[0] - 11) + '" y="' + (J[1] - 11) + '" width="22" height="22" rx="5" transform="rotate(45 ' + J[0] + " " + J[1] + ')"/>' +
      "</svg>" +
      '<div class="tt-root">' + petSprite(p) + '<span class="name-tag">' + esc(p.name) + " · " + types[p.type].name + "</span></div></div>"
    );
  }
  function traits() {
    const p = selected();
    const got = TRAITS.filter((t) => p.stage > 0 && t.ok(p));
    return (
      heading("", "성향 트리", "돌봄 경험이 쌓이면 성향 노드를 얻어요. 노드에 마우스를 올리면 조건이 보여요.",
        '<div class="date-chip">' + icon("spark") + got.length + " / " + TRAITS.length + " 획득</div>") +
      '<div class="filter-row">' +
      state.pets.filter((q) => q.owner !== "escrow").map((q) =>
        '<button class="filter-button ' + (q.id === p.id ? "active" : "") + '" data-action="select" data-pet="' + q.id + '">' + esc(q.name) + "</button>").join("") +
      "</div>" +
      '<section class="panel tree-panel">' + traitTree(p) +
      '<div class="tt-legend"><span><i class="lg on"></i>획득한 성향</span><span><i class="lg off"></i>아직 얻지 못한 성향</span><span><i class="lg lock"></i>진화 후 공개</span>' +
      '<span class="tt-exp">먹이 ' + (p.feeds || 0) + " · 놀기 " + (p.plays || 0) + " · 쉬기 " + (p.rests || 0) + " · 친밀도 " + Math.round(p.stats.friendship) + "</span></div></section>" +
      '<div class="trait-list">' + TRAITS.map((t) => {
        const on = p.stage > 0 && t.ok(p);
        return '<div class="trait-item ' + (on ? "on" : "") + '" style="--c:' + t.color + '"><span class="ti-icon">' + icon(t.icon) + "</span><span><strong>" + t.name + "</strong><small>" + t.rule + "</small></span>" + (on ? '<b>획득</b>' : "") + "</div>";
      }).join("") + "</div>"
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
        "성장기 이상인 두 뉴로링을 고르고, 두 소유자가 모두 동의하면 알이 생겨요.",
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
        "교배로 태어난 뉴로링의 부모 기록이에요.",
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
      ({ home, collection, traits, dating, eggs, family }[route] || home)() +
      "</div>";
    document.body.classList.toggle("night", !!state.night);
    if (route === "home") mountStage();
    else stg.gen++;
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
        traits: "성향 트리",
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
    interact(action);
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
    if (p.stage === 3) {
      const t = temper(brainOf(p));
      p.branch = t[0] + t[2] >= t[1] + t[3] ? 0 : 1;
    }
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
          ? "가 " + types[p.type].branches[p.branch] + " 모습으로 진화했어요. 학습된 기질(" + (p.branch ? "경계·독립" : "탐색·친화") + " 쪽)이 갈래를 정했어요."
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
    const ba = brainOf(a), bb = brainOf(b), mix = (x, y) => r2(Math.max(0.05, (x + y) / 2 + (Math.random() - 0.5) * 0.06));
    child.brain = { W1: ba.W1.map((row, i) => row.map((w, j) => mix(w, bb.W1[i][j]))), W2: ba.W2.map((row, j) => row.map((w, k) => mix(w, bb.W2[j][k]))), n: 0, dw: 0, log: [{ t: "부모 두 회로의 가중치를 평균해 물려받음", d: "◆", at: Date.now() }], last: null };
    child.brain.base = temper(child.brain);
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
      case "pat":
      case "feed":
      case "play":
      case "call":
      case "walk":
      case "rest":
        interact(action);
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
      case "share": {
        const url = new URL(".", location.href);
        if (!["http:", "https:"].includes(url.protocol) || ["localhost", "127.0.0.1"].includes(url.hostname)) {
          toast("공개된 게임 링크에서 공유해 주세요.");
          break;
        }
        const link = url.href;
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({ title: "HatchMind", text: "나만의 뉴로링을 키워보세요.", url: link });
            break;
          } catch (error) {
            if (error.name === "AbortError") break;
          }
        }
        try {
          await navigator.clipboard.writeText(link);
          toast("게임 링크를 복사했어요. 누구에게나 공유할 수 있어요.");
        } catch {
          openDialog("게임 링크 공유", '<p>아래 주소를 복사해 공유해 주세요. 각자의 기기에서 따로 플레이해요.</p><input aria-label="공유할 게임 주소" readonly value="' + esc(link) + '">');
        }
        break;
      }

      case "about":
        openDialog(
          "체험 모드 안내",
          "<p>HatchMind 게임 화면 체험이에요. 정원에서 쓰다듬기·먹이·놀이·부르기·산책·재우기로 뉴로링과 상호작용하면, 그 입력이 커넥톰 회로를 학습시켜 반응과 기질이 바뀌어요. 성장, 교배 동의, 알 선물과 회수도 체험할 수 있어요.</p><p>혼자 플레이하는 게임이에요. 위쪽 메뉴의 dewey·axie·kitty·tama는 이 기기 안의 플레이 그룹이며 다른 유저 계정이 아니에요. 만남과 선물도 같은 브라우저에서만 체험하고, 실제 지갑 연결이나 블록체인 거래는 발생하지 않아요. 진행 상황은 각자의 브라우저에만 저장되며 다른 기기로 자동 동기화되지 않아요.</p>" +
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
  document.addEventListener("keydown", (event) => {
    if (route !== "home" || dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || "")) return;
    const i = Number(event.key) - 1;
    if (i >= 0 && i < VERBS.length) {
      const b = document.querySelector('#verbs [data-action="' + VERBS[i].a + '"]');
      if (b && !b.disabled) { event.preventDefault(); interact(VERBS[i].a); }
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
    route = ["home", "collection", "traits", "dating", "eggs", "family"].includes(hash)
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
