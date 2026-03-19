// =====================
// p5.js → Vanilla JS ヘルパー
// =====================
function randomFloat(min, max) {
  if (max === undefined) { max = min; min = 0; }
  return Math.random() * (max - min) + min;
}
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
// p5のrandom()を置き換え：引数なし→0-1、配列→要素、(min,max)→範囲
function random(a, b) {
  if (a === undefined) return Math.random();
  if (Array.isArray(a)) return randomItem(a);
  if (b === undefined) return Math.random() * a;
  return randomFloat(a, b);
}
function floor(n) { return Math.floor(n); }
function constrain(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
function max(...args) { return Math.max(...args); }
function min(...args) { return Math.min(...args); }

// DOM生成ヘルパー（p5風APIをvanillaで再現）
function el(tag, text) {
  let e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return wrap(e);
}
function wrap(domEl) {
  // p5風メソッドチェーンが使えるラッパー
  let w = {
    elt: domEl,
    parent(p) {
      let target = p && p.elt ? p.elt : (typeof p === 'string' ? document.getElementById(p) : p);
      if (target) target.appendChild(domEl);
      return w;
    },
    id(s) { domEl.id = s; return w; },
    class(s) { domEl.className = s; return w; },
    addClass(s) { domEl.classList.add(s); return w; },
    removeClass(s) { domEl.classList.remove(s); return w; },
    html(s) { domEl.innerHTML = s; return w; },
    style(prop, val) {
      if (val === undefined) return domEl.style[prop];
      domEl.style[prop] = val; return w;
    },
    attribute(k, v) {
      if (v === null || v === undefined) domEl.removeAttribute(k);
      else domEl.setAttribute(k, v);
      return w;
    },
    value() { return domEl.value; },
    mousePressed(fn) { domEl.addEventListener('click', fn); return w; },
    mouseClicked(fn) { // 互換性
      if (fn === null) return w;
      domEl.addEventListener('click', fn); return w;
    },
    remove() { if (domEl.parentNode) domEl.parentNode.removeChild(domEl); },
  };
  return w;
}
function createDiv(html) { let w = el('div'); if (html) w.html(html); return w; }
function createButton(label) { return el('button', label); }
function createElement(tag, text) { return el(tag, text); }
function createImg(src, alt) {
  let img = document.createElement('img');
  img.src = src; img.alt = alt || '';
  return wrap(img);
}
function select(selector) {
  let dom = document.querySelector(selector);
  return dom ? wrap(dom) : null;
}

// sketch.js

// =====================
// DOM要素
// =====================
let container, leftWindow, leftTop, leftBottom, textZone, actionPanel, rightWindow;

// =====================
// プレイヤー
// =====================

// =====================
// アイテム説明データ
// =====================
const itemDescriptions = {
  '木の枝':   '乾いた枝。焚火の燃料になる。何か作れそうな気もする。',
  '草':       '細くて丈夫な草。束ねれば紐が作れそうだ。',
  '石':       '手頃な大きさの石。何かに使えるかもしれない。',
  '木材':     'しっかりした木材。いろいろなものが作れそうだ。焚火の燃料にもなる（+3）。',
  '小果実':   '甘酸っぱい小さな実。食べると気力が回復する。<br>【気力 +10】',
  'りんご':   '赤くてみずみずしいりんご。食べると気力が回復する。<br>【気力 +10】',
  'うさぎ肉': '新鮮なうさぎの肉。生で食べられる。<br>【気力 +15】',
  '狼の肉':   '狼の肉。少し臭うが食べごたえがある。<br>【気力 +20】',
  '干し肉':   '干して保存したうさぎ肉。腹持ちがいい。<br>【体力 +15 / 気力 +10】',
  '狼肉の燻製':'薬草で燻したうまそうな肉。食べると力が戻る気がする。<br>【体力 +20 / 気力 +20】',
  '薬草スープ':'薬草と骨で作ったスープ。体の傷に効きそうだ。<br>【体力 +20】',
  '万能薬':   '研究所で作った特製の薬。体力を完全に回復できそうだ。<br>【体力 全回復】',
  '骨':       '動物の骨。鋭く削れば武器になりそうだ。',
  '牙':       '鋭い動物の牙。武器の素材になりそうだ。',
  '翼の膜':   'コウモリの翼の薄い膜。意外と丈夫だ。弓でも作れそうか。',
  '毒の牙':   '毒ヘビの牙。触ると危ない。弾に塗ればダメージが上がりそうだ。',
  '蛇の皮':   '毒ヘビの皮。乾燥させると粘着力があるらしい。接着剤の材料になりそう。',
  '鉄鉱石':   '重くてざらざらした石。鉄が含まれているようだ。',
  '純鉄':     'きれいに精製された鉄。強力な武器が作れそうだ。',
  '大きな木材':'太くて長い木材。頑丈な武器に使えそう。',
  '特別な木材':'研究所近くで見つけた珍しい木材。やたら硬い。',
  '薬草':     '薬効があるらしい草。食べたり料理に使ったりできそうだ。',
  '貴重な薬草':'珍しい薬草。強力な薬が作れそうだ。',
  '宝石':     'きれいな石。これと薬草を組み合わせれば薬になるらしい。',
  '接着剤のもと':'研究所で見つけた有機系の材料。蛇の皮と混ぜると接着剤になるらしい。',
  '接着剤':   '手製の接着剤。壊れた鍵のかけらをくっつけられそうだ。',
  'カギのかけら':'折れた鍵の破片。接着剤でくっつければ使えるかもしれない。',
  '研究室の鍵':'修復した鍵。研究室の扉が開けられそうだ。',
  '研究メモ':  '研究者が残したメモ。何か重要なことが書いてあるかもしれない。',
  '実験記録':  '実験の詳細な記録。読む気になれないが、何か手がかりになるかも。',
  '非常食':   '賞味期限不明の非常食。食べる気になれるかは別として、いざという時に。',
  '救急キット':'研究所の救急セット。体力が回復できそうだ。<br>【体力 +25】',
  'フレアガン':'信号弾を撃ち出すガン。遠くの敵に有効。<br>【射程 3〜5 / 攻撃力 4】',
  '研究所の記録':'研究所の全記録が入ったデータ。これを持ち出せば証拠になる。謎解きルートのカギだ。',
  'トランシーバー':'古いが動いている無線機。これで助けを呼べるかもしれない。',
  'パチンコ':  '木の枝と紐で作った投石器。石を勢いよく飛ばせる。<br>【射程 2〜3 / 攻撃力 1】',
  '木の棒':   '紐で補強した木の棒。殴ると意外と痛い。<br>【射程 1 / 攻撃力 3】',
  '骨の短剣':  '骨を削って作った短剣。刃はなかなか鋭い。<br>【射程 1 / 攻撃力 5】',
  '牙の槍':   '牙を先端につけた槍。リーチがある。<br>【射程 1〜2 / 攻撃力 6】',
  '鉄の斧':   '鉄鉱石で作った斧。重くて強力だ。<br>【射程 1 / 攻撃力 10】',
  '純鉄の剣':  '純鉄製の剣。これで大抵の敵は倒せそう。<br>【射程 1 / 攻撃力 15】',
  '毒塗りパチンコ':'毒牙を塗った弾を使うパチンコ。遠距離から痛手を与えられる。<br>【射程 2〜4 / 攻撃力 4】',
  '翼の弓':   '翼の膜で作った弓。軽くて扱いやすい。<br>【射程 3〜5 / 攻撃力 7】',
};
let player = { hp: 100, mp: 50 };
const MAX_HP = 100;
const MAX_MP = 50;

// =====================
// ゲーム状態
// =====================
let state = 'opening'; // opening, game, battle, gameover
let elapsedTime = 0;

// =====================
// 探索・層管理
// =====================
const EXPLORE_LIMIT = 10;
let exploreCounts   = { '広場': 0, '森': 0, '洞窟': 0 };
let exploreCooldown = { '広場': 0, '森': 0, '洞窟': 0 };
let currentPlace = '広場';

// 場所ごとの現在層（森・洞窟のみ使用）
let placeLayers = { '森': 0, '洞窟': 0 };
// 場所ごとの最高到達層（逃走時の戻り先計算に使用）
let maxLayers = { '森': 0, '洞窟': 0 };
let placeKillCounts = { '森': 0, '洞窟': 0, '廊下': 0, '研究室': 0, '実験室': 0, '倉庫': 0 };

// =====================
// アイテム管理
// =====================
let itemCounts = {};
let hasCampfire = false;
let campfireFuel = 0;  // 焚火の残燃料（木の枝=1, 木材=3）
let hasRaft = false;
let selectedItem = null;

// =====================
// ケイ（生存者）管理
// =====================
let keiState = 'unknown';  // unknown→forest_reachable→met（森8層）→plaza（広場合流）
let labUnlocked = false;    // 研究所への入口が開いたか
let labHasKey = false;      // 研究室の鍵を持っているか
let labGunTaken = false;    // 倉庫の特別武器を入手済みか
let labGlueMaterialTaken = false; // 実験室で接着剤のもとを入手済みか
let labNaotoMet = false;    // 林ナオトと会ったか（廊下イベント）
let labNaotoDead = false;   // 林ナオト戦を終えたか
let currentRoom = null;     // 研究所内の現在部屋（null=研究所外）
let keiTalkCount = 0;      // ケイとの会話回数（0〜3）
let forest3EventDone = false; // 森3層イベント完了フラグ
let forest8EventDone = false; // 森8層ケイ遭遇イベント完了フラグ
let keiHealDone = false;      // ケイへのアイテム渡しイベント完了フラグ
let keiPlazaArrived = false;  // ケイの広場合流イベント完了フラグ

// =====================
// 制作画面
// =====================
let showRecipes = false;
let selectedRecipe = null;

// 武器データ { range:[min,max], atk }
const weapons = {
  'フレアガン':     { range: [3, 5], atk: 4 },
  'パチンコ':       { range: [2, 3], atk: 1 },
  '木の棒':         { range: [1, 1], atk: 3 },
  '骨の短剣':       { range: [1, 1], atk: 5 },
  '牙の槍':         { range: [1, 2], atk: 6 },
  '鉄の斧':         { range: [1, 1], atk: 10 },
  '純鉄の剣':       { range: [1, 1], atk: 15 },
  '毒塗りパチンコ': { range: [2, 4], atk: 4 },
  '翼の弓':         { range: [3, 5], atk: 7 },
};

// レシピデータ
const recipes = {
  // --- 基本 ---
  '紐':           { req: { '草': 2 },                                    time: 1 },
  '火打石':       { req: { '石': 2 },                                    time: 1 },
  '焚火':         { req: { '火打石': 1, '木材': 2, '紐': 1 },            time: 3 },
  'いかだ':       { req: { '木材': 5, '紐': 5 },                         time: 4 },

  // --- 武器（木・石系） ---
  'パチンコ':     { req: { '紐': 1, '木の枝': 1, '石': 1 },              time: 1, weapon: true },
  '木の棒':       { req: { '紐': 1, '木の枝': 3 },                       time: 1, weapon: true },

  // --- 武器（強化・素材活用） ---
  '骨の短剣':     { req: { '骨': 3, '紐': 1 },                           time: 1, weapon: true },
  // 骨3+紐1：射程1 攻撃力5
  '牙の槍':       { req: { '牙': 2, '木材': 2, '紐': 2 },                time: 2, weapon: true },
  // 牙2+木材2+紐2：射程2 攻撃力6
  '鉄の斧':       { req: { '鉄鉱石': 3, '大きな木材': 1, '紐': 2 },      time: 3, weapon: true },
  // 鉄鉱石3+大きな木材1+紐2：射程1 攻撃力10
  '純鉄の剣':     { req: { '純鉄': 2, '特別な木材': 1, '紐': 2 },        time: 3, weapon: true },
  // 純鉄2+特別な木材1+紐2：射程1 攻撃力15
  '毒塗りパチンコ': { req: { '毒の牙': 1, '紐': 1, '石': 2 },            time: 2, weapon: true },
  // 毒の牙1+紐1+石2：射程2〜4 攻撃力4
  '翼の弓':       { req: { '翼の膜': 2, '特別な木材': 1, '紐': 3 },      time: 3, weapon: true },
  // 翼の膜2+特別な木材1+紐3：射程3〜5 攻撃力7

  // --- 食料・回復 ---
  '干し肉':       { req: { 'うさぎ肉': 2 },                              time: 1 },
  '狼肉の燻製':   { req: { '狼の肉': 1, '薬草': 1 },                     time: 2 },
  '薬草スープ':   { req: { '薬草': 2, '骨': 1 },                         time: 1 },
  '万能薬':       { req: { '貴重な薬草': 1, '宝石': 1 },                 time: 2 },

  // --- 研究所系（実験室探索後に解放） ---
  '接着剤':       { req: { '蛇の皮': 1, '接着剤のもと': 1 },             time: 1, labOnly: true },
  '研究室の鍵':   { req: { 'カギのかけら': 1, '接着剤': 1 },             time: 1, labOnly: true },
};

// 場所ごとの説明
const placeDescriptions = {
  '広場': '広場は開けた場所で、見晴らしが良い。時折鳥のさえずりが聞こえる。',
  '森':   '森は木々が生い茂り、静寂の中に小さな動物の気配を感じる。',
  '洞窟': '洞窟はひんやりとして薄暗く、足元には石ころが散らばっている。',
};

// =====================
// エネミーデータ
// =====================
const enemyTypes = {
  // === 浅い層（常時出現） ===
  'うさぎ': {
    hp: [6, 9], atk: 3, range: 1,
    minLayer: 0,
    drops: [
      { item: 'うさぎ肉', chance: 0.8 },
      { item: '骨',       chance: 0.5 },
    ],
    places: ['森', '広場'],
  },
  'おおかみ': {
    hp: [12, 18], atk: 6, range: 1,
    minLayer: 0,
    drops: [
      { item: '牙',     chance: 0.8 },
      { item: '狼の肉', chance: 0.7 },
      { item: '骨',     chance: 0.5 },
    ],
    places: ['森'],
  },
  'コウモリ': {
    hp: [8, 12], atk: 4, range: 1,
    minLayer: 0,
    drops: [
      { item: '翼の膜', chance: 0.7 },
      { item: '骨',     chance: 0.5 },
    ],
    places: ['洞窟'],
  },
  // === 深い層（layer>=3）：遠距離攻撃敵 ===
  'スナイパーリス': {
    hp: [10, 14], atk: 5, range: 3,   // 射程3
    minLayer: 3,
    drops: [
      { item: '牙', chance: 0.6 },
      { item: '骨', chance: 0.5 },
    ],
    places: ['森'],
  },
  '石投げゴブリン': {
    hp: [12, 16], atk: 6, range: 4,   // 射程4
    minLayer: 3,
    drops: [
      { item: '石',      chance: 0.9 },
      { item: '鉄鉱石', chance: 0.5 },
    ],
    places: ['洞窟'],
  },
  // === さらに深い層（layer>=6）：強力な遠距離敵 ===
  '毒ヘビ': {
    hp: [15, 22], atk: 8, range: 3,   // 射程3
    minLayer: 6,
    drops: [
      { item: '毒の牙',     chance: 0.8 },
      { item: '貴重な薬草', chance: 0.4 },
    ],
    places: ['森', '洞窟'],
  },
  'オーク弓兵': {
    hp: [18, 25], atk: 9, range: 4,   // 射程4
    minLayer: 6,
    drops: [
      { item: '鉄鉱石', chance: 0.8 },
      { item: '純鉄',   chance: 0.4 },
    ],
    places: ['洞窟'],
  },
};

// =====================
// 戦闘状態
// =====================
let battle = {
  active: false,
  enemyName: '',
  enemyHp: 0,
  enemyMaxHp: 0,
  enemyAtk: 0,
  enemyRange: 0,
  distance: 0,
  playerTurn: true,
  place: '',
  turns: 0,        // 合計ターン数
  killCount: 0,    // 場所ごとの撃破数（2体で層UP）
};

// =====================
// メッセージ待機
// =====================
let messageWaiting = false;
let nextAction = null;

// =====================
// セットアップ
// =====================
function setup() {
  container   = createDiv().id('container');
  document.body.appendChild(container.elt);
  leftWindow  = createDiv().id('leftWindow').parent(container);
  leftTop     = createDiv().id('leftTop').parent(leftWindow);
  // 経過時間・戦闘情報オーバーレイ（leftTopの中に1つだけ持つ）
  createDiv().id('infoOverlay').parent(leftTop);

  leftBottom  = createDiv().id('leftBottom').parent(leftWindow);
  textZone    = createDiv().id('textZone').parent(leftBottom);
  actionPanel = createDiv().id('actionPanel').parent(leftBottom);
  rightWindow = createDiv().id('rightWindow').parent(container);
  updateElapsedTime();
  showOpening();
}

// =====================
// メッセージ表示
// =====================
function showMessage(msg, waitForClick = false, afterFunc = null) {
  textZone.html(msg);
  textZone.elt.removeEventListener('click', onMessageClick);
  if (waitForClick) {
    messageWaiting = true;
    nextAction = afterFunc;
    textZone.style('cursor', 'pointer');
    textZone.elt.addEventListener('click', onMessageClick);
    textZone.addClass('waiting');
    actionPanel.style('visibility', 'hidden'); // クリック待ち中はactionPanelを隠す
  } else {
    messageWaiting = false;
    nextAction = null;
    textZone.style('cursor', 'default');
    textZone.removeClass('waiting');
    actionPanel.style('visibility', 'visible'); // 解除で再表示
  }
}

function onMessageClick() {
  if (!messageWaiting) return;
  messageWaiting = false;
  textZone.style('cursor', 'default');
  textZone.elt.removeEventListener('click', onMessageClick);
  textZone.removeClass('waiting');
  actionPanel.style('visibility', 'visible');
  let action = nextAction;
  nextAction = null;
  if (typeof action === 'function') action();
}

// =====================
// オープニング
// =====================
function showOpening() {
  showMessage('主人公は一般人ですが、無人島に遭難してしまいました。<br>なんとかして脱出を試みよう！');
  actionPanel.html('');
  rightWindow.html('');

  createButton('ゲーム開始').parent(actionPanel).mousePressed(() => {
    state = 'game';
    updateParams();
    showMainActions();
  });

  // セーブデータがあれば「続きから」を表示
  if (localStorage.getItem('savedata')) {
    createButton('続きから').parent(actionPanel).mousePressed(() => {
      loadAndRefresh();
    });
  }

  // READMEボタン
  createButton('README').parent(actionPanel).mousePressed(() => {
    actionPanel.html('');
    textZone.elt.innerHTML = '';
    // readme.md をfetchして表示
    fetch('readme.md')
      .then(r => r.text())
      .then(txt => {
        // 簡易markdown→HTML変換（#見出しと改行のみ）
        let html = txt
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .split('\n').join('<br>');
        textZone.elt.innerHTML = html;
      })
      .catch(() => { textZone.elt.innerHTML = 'readme.md が見つかりませんでした。'; });
    createButton('タイトルに戻る').parent(actionPanel).mousePressed(() => showOpening());
  });
}

// =====================
// leftTop：経過時間（通常時）
// =====================
function updateElapsedTime() {
  if (!showRecipes && !battle.active) {
    let layerStr = '';
    if (currentRoom !== null) {
      layerStr = `　研究所：${currentRoom}`;
    } else if (currentPlace === '森' || currentPlace === '洞窟') {
      layerStr = `　${currentPlace} ${placeLayers[currentPlace] + 1}層`;
    }
    // 背景画像を現在地に合わせて切り替え
    updateBgImage(currentRoom ? '洞窟' : currentPlace);
    // シルエットcanvasをクリア（戦闘外は非表示）
      // infoOverlayにテキスト表示
    let overlay = select('#infoOverlay');
    if (overlay) overlay.html(`<span class="info-badge">経過時間: ${elapsedTime} 時間${layerStr}</span>`);
  }
}

// 背景画像を切り替える
function updateBgImage(place) {
  // leftTop自体にbackground-imageを直接設定
  const bgMap = { '広場': 'hiroba', '森': 'mori', '洞窟': 'doukutu' }; // ※ファイル名が doukutsu.jpg の場合は 'doukutsu' に変更
  let fname = bgMap[place] || 'hiroba';
  leftTop.style('background-image', `url('${fname}.jpg')`);
  leftTop.style('background-size', 'cover');
  leftTop.style('background-position', 'center');
}



// =====================
// rightWindow：ステータス＋アイテム一覧
// =====================
function updateParams() {
  if (messageWaiting) return; // showRecipesのガードは外す（制作中もアイテム一覧を即時反映）
  rightWindow.html('');

  let hpColor = player.hp <= 20 ? 'tomato' : '#eee';
  let mpColor = player.mp <= 10 ? 'orange' : '#eee';
  let fuelStr = hasCampfire ? `<div class="param" style="color:${campfireFuel <= 2 ? 'orange' : '#eee'}">🔥 焚火燃料: ${campfireFuel}</div>` : '';
  createDiv(`
    <h2 style="margin:0 0 6px">ステータス</h2>
    <div class="param" style="color:${hpColor}">体力 (HP): ${player.hp} / ${MAX_HP}</div>
    <div class="param" style="color:${mpColor}">気力 (MP): ${player.mp} / ${MAX_MP}</div>
    ${fuelStr}
  `).parent(rightWindow);

  // 戦闘中は敵情報も表示
  if (battle.active) {
    createDiv(`
      <h3 style="margin:8px 0 4px">敵：${battle.enemyName}</h3>
      <div class="param">敵HP: ${battle.enemyHp} / ${battle.enemyMaxHp}</div>
      <div class="param">距離: ${battle.distance}</div>
    `).parent(rightWindow);
  }

  // アイテム一覧
  createElement('h3', 'アイテム一覧').parent(rightWindow).style('margin', '10px 0 4px');
  let listDiv = createDiv().id('itemList').parent(rightWindow);
  if (Object.keys(itemCounts).length === 0) {
    listDiv.html('<i>アイテムがありません。</i>');
  } else {
    for (let name in itemCounts) {
      let div = createDiv(`${name} ×${itemCounts[name]}`).parent(listDiv);
      div.class('item-entry');
      if (selectedItem === name) div.addClass('selected');
      // ネイティブaddEventListenerでクロージャ選択（p5 mouseClickedバグ回避）
      div.elt.addEventListener('click', (function(n) {
        return function() { selectedItem = n; updateParams(); };
      })(name));
    }
  }

  // 使用・捨てるボタン（戦闘中は非表示）
  if (!battle.active) {
    let btnDiv = createDiv().id('itemButtons').parent(rightWindow);
    let btnUse = createButton('使用').parent(btnDiv);
    if (!selectedItem) btnUse.attribute('disabled', 'true');
    btnUse.mousePressed(() => { if (selectedItem) useItem(selectedItem); });

    // 説明ボタン
    let btnDesc = createButton('説明').parent(btnDiv);
    if (!selectedItem) btnDesc.attribute('disabled', 'true');
    btnDesc.mousePressed(() => {
      if (!selectedItem) return;
      let desc = itemDescriptions[selectedItem] || '特に説明はない。';
      let prevMsg = textZone.elt.innerHTML;
      showMessage(`【${selectedItem}】<br>${desc}`, true, () => {
        showMessage(prevMsg);
      });
    });

    // 「渡す」ボタン：ケイがmet状態かつ未回復、回復系アイテム選択時
    const healItems = ['りんご','小果実','うさぎ肉','狼の肉','干し肉','狼肉の燻製','薬草スープ','万能薬'];
    if (keiState === 'met' && !keiHealDone && selectedItem && healItems.includes(selectedItem)) {
      let btnGive = createButton('渡す').parent(btnDiv);
      btnGive.style('border-color', 'var(--accent-dim)');
      btnGive.style('color', 'var(--accent)');
      btnGive.mousePressed(() => giveItemToKei(selectedItem));
    }

    let btnDiscard = createButton('捨てる').parent(btnDiv);
    if (!selectedItem) btnDiscard.attribute('disabled', 'true');
    btnDiscard.mousePressed(() => {
      if (!selectedItem || !itemCounts[selectedItem]) return;
      let name = selectedItem;
      itemCounts[name]--;
      if (itemCounts[name] <= 0) { delete itemCounts[name]; selectedItem = null; }
      showMessage(`「${name}」を捨てました。`);
      updateParams();
    });
  }

  // セーブ・ロードボタン（戦闘中以外は常時表示）
  if (!battle.active) {
    let saveDiv = createDiv().id('saveButtons').parent(rightWindow);
    createButton('セーブ').parent(saveDiv).mousePressed(() => saveGame());
    let btnLoad = createButton('ロード').parent(saveDiv);
    if (!localStorage.getItem('savedata')) btnLoad.attribute('disabled', 'true');
    btnLoad.mousePressed(() => loadAndRefresh());
  }
}

// =====================
// アイテム使用
// =====================
function useItem(name) {
  if (!name || !itemCounts[name]) return;

  // 食べ物・回復アイテム
  const foodTable = {
    'りんご':       { hp: 0,       mp: 10 },
    '小果実':       { hp: 0,       mp: 10 },
    'うさぎ肉':     { hp: 0,       mp: 15 },
    '狼の肉':       { hp: 0,       mp: 20 },
    '干し肉':       { hp: 15,      mp: 10 },
    '狼肉の燻製':   { hp: 20,      mp: 20 },
    '薬草スープ':   { hp: 20,      mp: 0  },
    '万能薬':       { hp: MAX_HP,  mp: 0  }, // HP全回復
  };
  if (name in foodTable) {
    let f = foodTable[name];
    let hpGain = f.hp === MAX_HP ? (MAX_HP - player.hp) : f.hp; // 全回復の場合は差分
    player.hp = constrain(player.hp + f.hp, 0, MAX_HP);
    player.mp = constrain(player.mp + f.mp, 0, MAX_MP);
    itemCounts[name]--;
    if (itemCounts[name] <= 0) { delete itemCounts[name]; selectedItem = null; }
    let msg = `「${name}」を使った。`;
    if (f.hp === MAX_HP) msg += ` HPが全回復した！`;
    else {
      if (f.hp > 0) msg += ` HP+${f.hp}。`;
      if (f.mp > 0) msg += ` 気力+${f.mp}。`;
    }
    showMessage(msg);
    updateParams();
    return;
  }

  // トランシーバー：クリア
  if (name === 'トランシーバー') {
    showMessage(
      'トランシーバーを使って助けを呼んだ。<br>' +
      '「こちら救助隊です。位置を確認しました。今すぐ向かいます！」<br>' +
      '……しばらくして、ヘリコプターの音が聞こえてきた。無事に救助された！',
      true,
      () => {
        clearUI();
        container.html('');
        createDiv().parent(container)
          .style('color','lime').style('font-size','40px')
          .style('text-align','center').style('padding-top','160px')
          .html('救助成功！<br><span style="font-size:24px">トランシーバーで助けを呼び、無事に帰還した。</span>');
        createButton('タイトルに戻る').parent(container)
          .style('font-size','22px').style('margin-top','30px')
          .mousePressed(() => location.reload());
      }
    );
    return;
  }

  // 木の枝・木材：焚火の燃料として使う
  if (name === '木の枝' || name === '木材') {
    if (!hasCampfire && campfireFuel <= 0) {
      showMessage('焚火がありません。まず焚火を設置してください。');
      return;
    }
    let fuel = name === '木の枝' ? 1 : 3;
    campfireFuel += fuel;
    if (!hasCampfire) hasCampfire = true; // 燃料が入ったので再点火
    itemCounts[name]--;
    if (itemCounts[name] <= 0) { delete itemCounts[name]; selectedItem = null; }
    showMessage(`「${name}」を焚火に投入した。残燃料：${campfireFuel}`);
    updateParams();
    return;
  }

  // 焚火設置（広場のみ）
  if (name === '焚火') {
    if (currentPlace === '広場') {
      hasCampfire = true;
      campfireFuel = 5; // 設置時に初期燃料5
      itemCounts[name]--;
      if (itemCounts[name] <= 0) { delete itemCounts[name]; selectedItem = null; }
      showMessage(`広場に焚火を設置した。初期燃料：${campfireFuel}`);
      updateParams(); showMainActions();
    } else { showMessage('焚火は広場でしか設置できません。'); }
    return;
  }

  // いかだ設置（広場のみ）
  if (name === 'いかだ') {
    if (currentPlace === '広場') {
      hasRaft = true;
      itemCounts[name]--;
      if (itemCounts[name] <= 0) { delete itemCounts[name]; selectedItem = null; }
      showMessage('広場にいかだを設置した。');
      updateParams(); showMainActions();
    } else { showMessage('いかだは広場でしか設置できません。'); }
    return;
  }

  // 研究所の記録：謎解きルートクリアに使用
  if (name === '研究所の記録') {
    showMessage(
      '「研究所の記録」を手に入れた。<br>' +
      'この記録があれば、プロジェクトTIDALの真実を世に出せる。<br>' +
      '<span style="color:#adf">（謎解きルートクリア条件を満たした。いかだか、トランシーバーで脱出しよう）</span>'
    );
    return;
  }

  showMessage(`「${name}」はここでは使えません。`);
}

// =====================
// 制作画面（leftTopに表示）
// =====================
function renderRecipeList() {
  showRecipes = true;
  // infoOverlayを空にし、既存の制作UIを削除してから再描画
  let overlay = select('#infoOverlay');
  if (overlay) overlay.html('');
  let oldList = select('#recipeList');
  if (oldList) oldList.remove();
  let oldBtns = select('#craftButtons');
  if (oldBtns) oldBtns.remove();
  let oldH2 = select('#recipeH2');
  if (oldH2) oldH2.remove();
  let rH2 = createElement('h2', '制作レシピ').parent(leftTop);
  rH2.id('recipeH2');
  rH2.style('margin', '0 0 6px 0');

  let listDiv = createDiv().id('recipeList').parent(leftTop);
  for (let name in recipes) {
    let r = recipes[name];
    if (r.labOnly && !labGlueMaterialTaken) continue; // 研究所系：実験室探索後のみ表示
    let reqStr = Object.entries(r.req).map(([k, v]) => `${k}×${v}`).join(' ＆ ');
    let label = r.weapon ? `⚔ ${name}` : name;
    // 材料が揃っているか確認して〇/×を表示
    let canCraft = Object.entries(r.req).every(([item, num]) => (itemCounts[item] || 0) >= num);
    let marker = canCraft ? '<span style="color:var(--accent)">〇 </span>' : '<span style="color:var(--text-faint)">× </span>';
    let div = createDiv(`${marker}${label}：${reqStr}（${r.time}時間）`).parent(listDiv);
    div.class('item-entry');
    if (selectedRecipe === name) div.addClass('selected');
    div.elt.addEventListener('click', (function(n) {
      return function() {
        selectedRecipe = n;
        // レシピ説明をテキストゾーンに表示
        let desc = {
    '紐': '草を編んで作った紐。あちこちで使える基本素材。',
    '火打石': '石を組み合わせた発火道具。焚火を作るのに必要だ。',
    '焚火': '夜の寒さをしのぎ、休憩に使える拠点設備。燃料が必要。',
    'いかだ': '海に出るための筏。これで脱出できるかもしれない。ボスが待っているかも。',
    'パチンコ': '【武器】射程2〜3 / 攻撃力1。遠くから安全に攻撃できる最初の武器。',
    '木の棒': '【武器】射程1 / 攻撃力3。近距離で頼れる武器。',
    '骨の短剣': '【武器】射程1 / 攻撃力5。骨で作った短剣。パンチ力がある。',
    '牙の槍': '【武器】射程1〜2 / 攻撃力6。リーチがあって使いやすい。',
    '鉄の斧': '【武器】射程1 / 攻撃力10。鉄製の強力な武器。',
    '純鉄の剣': '【武器】射程1 / 攻撃力15。最強クラスの武器。',
    '毒塗りパチンコ': '【武器】射程2〜4 / 攻撃力4。遠距離から毒で攻撃できる。',
    '翼の弓': '【武器】射程3〜5 / 攻撃力7。最長射程の武器。遠くの敵に最適。',
    '干し肉': '【回復】体力+15 / 気力+10。保存食として持ち歩ける。',
    '狼肉の燻製': '【回復】体力+20 / 気力+20。強力な回復食。',
    '薬草スープ': '【回復】体力+20。体の傷を癒すスープ。',
    '万能薬': '【回復】体力全回復。最強の回復アイテム。',
    '接着剤': 'カギのかけらを修復するのに使える。蛇の皮を手に入れたら作れる。',
    '研究室の鍵': '研究室の扉を開ける鍵。接着剤でカギのかけらを修復して作る。'
  };
        if (desc[n]) showMessage(desc[n]);
        renderRecipeList();
      };
    })(name));
  }

  let btnDiv = createDiv().id('craftButtons').parent(leftTop);
  let btnCraft = createButton('制作する').parent(btnDiv);
  if (!selectedRecipe) btnCraft.attribute('disabled', 'true');
  btnCraft.mousePressed(() => { if (selectedRecipe) craftItem(selectedRecipe); });
  createButton('閉じる').parent(btnDiv).mousePressed(() => {
    showRecipes = false;
    selectedRecipe = null;
    // 制作UIを削除してleftTopをもとに戻す
    let oldH2   = select('#recipeH2');   if (oldH2)   oldH2.remove();
    let oldList = select('#recipeList'); if (oldList) oldList.remove();
    let oldBtns = select('#craftButtons'); if (oldBtns) oldBtns.remove();
    updateElapsedTime(); // infoOverlayに経過時間を再表示
  });
}

// =====================
// アイテム制作
// =====================
function craftItem(name) {
  let r = recipes[name];
  let missing = [];
  for (let item in r.req) {
    let have = itemCounts[item] || 0;
    let need = r.req[item];
    if (have < need) missing.push(`${item}（あと${need - have}個）`);
  }
  if (missing.length > 0) {
    showMessage(`材料が足りません：${missing.join('、')}`);
    return;
  }
  for (let item in r.req) {
    itemCounts[item] -= r.req[item];
    if (itemCounts[item] <= 0) { delete itemCounts[item]; if (selectedItem === item) selectedItem = null; }
  }
  passTime(r.time);
  addItem(name);
  showMessage(`「${name}」を制作した。（${r.time}時間）`);
  selectedRecipe = null; // 制作後は選択をリセット
  renderRecipeList();
  updateParams();
}

// =====================
// アイテム追加
// =====================
function addItem(name, count = 1) {
  itemCounts[name] = (itemCounts[name] || 0) + count;
}

// =====================
// メインアクション
// =====================


// =====================
// ケイへアイテムを渡す
// =====================
function giveItemToKei(itemName) {
  if (!itemName || !itemCounts[itemName]) return;
  itemCounts[itemName]--;
  if (itemCounts[itemName] <= 0) { delete itemCounts[itemName]; selectedItem = null; }
  keiHealDone = true;
  keiState = 'plaza'; // 合流フラグ（後で広場に来る）

  showPortrait('kei');
  showMessage(
    `「${itemName}」を差し出すと、ケイは両手で受け取り、すぐに口に入れた。<br>` +
    'しばらくして、顔に少し血色が戻ってきた。',
    true,
    () => showMessage(
      'ケイ：……ありがとうございます。少し楽になった。<br>' +
      'まだ歩くのは難しいですけど、なんとか広場まで行けると思います。<br>' +
      'そこで待ってます。',
      true,
      () => {
        hidePortrait();
        showMessage(
          '彼はゆっくりと立ち上がり、木に寄りかかりながら歩き始めた。<br>' +
          '<span style="color:var(--accent)">（ケイが広場に向かった）</span>',
          false, null
        );
        updateParams();
        showMainActions();
      }
    )
  );
}
// 操作パネルからの燃料投入
function addFuelFromPanel() {
  actionPanel.html('');
  showMessage('投入する燃料を選んでください。（木の枝：+1、木材：+3）');
  
  let fuelItems = ['木の枝', '木材'].filter(n => (itemCounts[n] || 0) > 0);
  if (fuelItems.length === 0) {
    showMessage('投入できる燃料がありません。木の枝か木材が必要です。');
    showMainActions();
    return;
  }
  fuelItems.forEach(item => {
    let gain = item === '木の枝' ? 1 : 3;
    createButton(`${item}（+${gain}）×${itemCounts[item]}`).parent(actionPanel)
      .mousePressed(() => {
        itemCounts[item]--;
        if (itemCounts[item] <= 0) delete itemCounts[item];
        campfireFuel += gain;
        if (!hasCampfire) hasCampfire = true;
        showMessage(`${item}を焚火に投入した。残燃料：${campfireFuel}`);
        updateParams();
        showMainActions();
      });
  });
  createButton('戻る').parent(actionPanel)
    .mousePressed(() => showMainActions());
}
function showMainActions() {
  if (messageWaiting) return;
  if (currentRoom !== null) { showLabActions(); return; }

  // 広場ケイ合流強制イベント
  if (currentPlace === '広場' && keiState === 'plaza' && !keiPlazaArrived
      && maxLayers['森'] >= 3 && elapsedTime >= 150) {
    keiPlazaArrived = true;
    actionPanel.html('');
    showPortrait('kei');
    showMessage(
      '広場に戻ると、見覚えのある人物が焚火の近くに座っていた。<br>' +
      '新川ケイだ。足を引きずりながらも、なんとかたどり着いたらしい。',
      true,
      () => showMessage(
        'ケイ：来てくれると思ってました。<br>足、だいぶよくなりました。あなたのおかげです。',
        true,
        () => showMessage(
          'ケイ：この島のこと、一緒に調べませんか。<br>洞窟の奥に……何かある気がしてるんです。',
          true,
          () => { hidePortrait(); updateParams(); showMainActions(); }
        )
      )
    );
    return;
  }

  actionPanel.html('');
  let layerStr = (currentPlace === '森' || currentPlace === '洞窟')
    ? `（${placeLayers[currentPlace] + 1}層）` : '';
  showMessage(`現在地：${currentPlace}${layerStr}　${placeDescriptions[currentPlace]}`);

  createButton('探索').parent(actionPanel).mousePressed(() => explore(currentPlace));
  createButton('移動').parent(actionPanel).mousePressed(() => showMoveOptions());
  // 広場で焚火あり：待機非表示、焚火ボタンを表示
  if (currentPlace === '広場' && hasCampfire) {
    createButton('焚火で休憩').parent(actionPanel).mousePressed(() => {
      player.mp = constrain(player.mp + 10, 0, MAX_MP);
      player.hp = constrain(player.hp + 5,  0, MAX_HP);
      showMessage('焚火の周りで休憩した。気力と体力が回復した。');
      updateParams();
    });
    createButton('燃料を投入').parent(actionPanel).mousePressed(() => addFuelFromPanel());
  } else {
    createButton('待機').parent(actionPanel).mousePressed(() => waitAction());
  }
  if (hasRaft) {
    createButton('いかだ').parent(actionPanel).mousePressed(onRaftClick);
  }

  if (currentPlace === '広場' && keiState === 'plaza' && keiPlazaArrived) {
    let keiBtn = createButton('ケイと話す').parent(actionPanel);
    keiBtn.style('border-color', 'var(--accent-dim)');
    keiBtn.style('color', 'var(--accent)');
    keiBtn.mousePressed(() => talkToKeiPlaza());
  }

  // 広場でのみ制作可能
  let btnCraftMain = createButton('制作').parent(actionPanel);
  if (currentPlace !== '広場') btnCraftMain.attribute('disabled', 'true');
  btnCraftMain.mousePressed(() => {
    if (currentPlace !== '広場') { showMessage('制作は広場でのみ行えます。'); return; }
    selectedRecipe = null;
    renderRecipeList();
  });
}

// =====================
// いかだ
// =====================
function onRaftClick() {
  if (player.hp >= 80 && player.mp >= 30) {
    clearUI(); container.html('');
    createDiv().parent(container)
      .style('color','lime').style('font-size','48px')
      .style('text-align','center').style('padding-top','200px')
      .html('ゲームクリア！');
    createButton('タイトルに戻る').parent(container)
      .style('font-size','24px').style('margin-top','30px')
      .mousePressed(() => location.reload());
  } else {
    showMessage('力が足りず、出発できなかった……', true, () => gameOver());
  }
}

// =====================
// 移動
// =====================
function showMoveOptions() {
  if (messageWaiting) return;
  actionPanel.html('');
  showMessage('移動先を選んでください。');

  // 通常エリア（現在地は表示しない）
  let places = ['広場', '森', '洞窟'];
  places.forEach(place => {
    if (place === currentPlace && currentRoom === null) return; // 現在地はスキップ
    createButton(place).parent(actionPanel).mousePressed(() => moveTo(place));
  });

  // 研究所エリア（解放済みの場合）
  if (labUnlocked) {
    let rooms = ['廊下', '研究室', '実験室', '倉庫'];
    rooms.forEach(room => {
      if (currentRoom === room) return; // 現在部屋はスキップ
      let btn = createButton(`研究所：${room}`).parent(actionPanel);
      // 研究室は鍵が必要
      if (room === '研究室' && !labHasKey) btn.attribute('disabled', 'true');
      btn.mousePressed(() => moveToLab(room));
    });
    // 洞窟6層への戻り口
    if (currentRoom !== null) {
      createButton('洞窟（6層）').parent(actionPanel).mousePressed(() => {
        currentRoom = null;
        moveTo('洞窟');
      });
    }
  }

  createButton('戻る').parent(actionPanel)
    .style('background-color', 'var(--bg-raised)')
    .mousePressed(() => showMainActions());
}

function moveTo(place) {
  currentRoom = null; // 研究所から出た場合リセット
  // 森・洞窟から他の場所へ移動すると層が-1（0以下にはならない）
  if ((currentPlace === '森' || currentPlace === '洞窟') && place !== currentPlace) {
    let prev = placeLayers[currentPlace];
    placeLayers[currentPlace] = max(0, prev - 1);
    if (prev > 0) {
      showMessage(`${currentPlace}から帰った。次回は ${placeLayers[currentPlace] + 1}層からになる。`);
    }
  }
  currentPlace = place;
  // 移動先のクールダウン・探索カウントをリセット
  exploreCooldown[place] = 0;
  exploreCounts[place] = 0;
  passTime(1);
  showMainActions();
}

// =====================
// 探索
// =====================
function explore(place) {
  if (exploreCooldown[place] > 0) {
    showMessage(`ここからはこれ以上何も見つからなさそうだ。<br>時間を置いてみよう。`);
    return;
  }

  exploreCounts[place]++;
  passTime(1);

  // 探索MP消費を1に変更
  player.mp = constrain(player.mp - 1, 0, MAX_MP);
  updateParams();

  if (exploreCounts[place] >= EXPLORE_LIMIT) {
    exploreCooldown[place] = 5;
    exploreCounts[place] = 0;
  }

  let layer = (place === '森' || place === '洞窟') ? placeLayers[place] : 0;

  // 森8層強制イベント（ケイ遭遇、初回のみ）
  if (place === '森' && layer >= 7 && !forest8EventDone) {
    forest8EventDone = true;
    keiState = 'met';
    showPortrait('kei');
    showMessage(
      '深い森の奥、木の根元に人が倒れているのが見えた。<br>' +
      '駆け寄ると、若い男だった。足に深い傷を負っている。<br>' +
      'ゆっくりと目を開け、こちらを見た。',
      true,
      () => showMessage(
        'ケイ：人間……？本当に人間ですか。<br>' +
        'よかった。もう10日も……動けなくて。',
        true,
        () => showMessage(
          'ケイ：あなたも、あの船から？<br>' +
          '僕は新川ケイ。港で林って人に声をかけられて……この航路を勧められたんです。',
          true,
          () => {
            hidePortrait();
            showMessage(
              '彼は足の傷がひどく、今すぐ動くことはできないようだった。<br>' +
              '何か回復するものを渡せれば、合流できるかもしれない。<br>' +
              '<span style="color:var(--accent)">（アイテム一覧から回復系アイテムを選んで「渡す」ボタンを押そう）</span>',
              false, null
            );
            updateParams();
            showMainActions();
          }
        )
      )
    );
    return;
  }

  // 森3層到達イベント（初回のみ）
  if (place === '森' && layer >= 2 && !forest3EventDone) {
    forest3EventDone = true;
    keiState = 'forest_reachable';
    showMessage(
      '草木を切り開いて奥へ進んだ。<br>' +
      '……道が開けた。この先に何かあるかもしれない。<br>' +
      '<span style="color:#adf">（森の奥に進めるようになった）</span>'
    );
    updateParams();
    return;
  }

  // 洞窟6層目：崩落で研究所への道が開く（100時間経過後のみ）
  if (place === '洞窟' && layer >= 5 && !labUnlocked) {
    if (elapsedTime >= 100) {
      labUnlocked = true;
      showMessage(
        '深部を進むと、崩落した壁の向こうに金属製の扉が見えた。<br>' +
        '……研究所への入口だ。<br>' +
        '<span style="color:#adf">（移動先に「研究所：廊下」が追加された）</span>',
        true, () => { updateElapsedTime(); updateParams(); showMainActions(); }
      );
    } else {
      showMessage('深部まで来たが、崩落した瓦礫が道を塞いでいる。まだ進めそうにない。');
      updateParams();
    }
    return;
  }

  let rand = random();

  if (place === '広場') {
    // 広場：85%アイテム、15%何もなし
    if (rand < 0.85) {
      let item = getRandomItem(place, layer);
      addItem(item);
      showMessage(`${place}を探索して「${item}」を入手した。`);
    } else {
      showMessage(`${place}を探索したが、何も見つからなかった。`);
    }
    updateParams();
  } else {
    // 森・洞窟：10%戦闘、80%アイテム、10%何もなし
    if (rand < 0.10) {
      startBattle(place);
    } else if (rand < 0.90) {
      // 層が高いほどアイテムを多く入手
      let itemCount = 1 + floor(layer / 3); // 3層ごとに1個追加
      let msgs = [];
      for (let i = 0; i < itemCount; i++) {
        let item = getRandomItem(place, layer);
        addItem(item);
        msgs.push(item);
      }
      showMessage(`${place}（${layer+1}層）を探索して「${msgs.join('、')}」を入手した。`);
      updateParams();
    } else {
      showMessage(`${place}を探索したが、何も見つからなかった。`);
      updateParams();
    }
  }
}

// 場所・層に応じたアイテムプール
function getRandomItem(place, layer = 0) {
  let pool;
  if (place === '広場') {
    // 広場：焚火燃料になる木の枝・草多め
    pool = ['木の枝', '木の枝', '小果実', '草', '草', '石'];
  } else if (place === '森') {
    pool = ['木材', '木の枝', '草', 'りんご'];
    if (layer >= 3) pool.push('大きな木材', '薬草', '薬草');
    if (layer >= 6) pool.push('特別な木材', '貴重な薬草');
  } else {
    // 洞窟：コインを削除（使い道なし）、素材中心に
    pool = ['石', '石', '木材'];
    if (layer >= 3) pool.push('鉄鉱石', '鉄鉱石', '宝石');
    if (layer >= 6) pool.push('純鉄', '純鉄');
  }
  return random(pool);
}

// =====================
// 待機
// =====================
function waitAction() {
  // 研究所内での待機（敵出現2%）
  if (currentRoom !== null) {
    if (random() < 0.02) {
      showMessage('物音がした……');
      passTime(1);
      startBattle('洞窟');
    } else {
      showMessage('待機した。');
      passTime(1);
      showLabActions();
    }
    return;
  }
  if (currentPlace === '広場' && hasCampfire) {
    player.mp = constrain(player.mp + 10, 0, MAX_MP);
    player.hp = constrain(player.hp + 5,  0, MAX_HP);
    showMessage('焚火で休憩した。気力と体力が回復した。');
    passTime(1);
    showMainActions();
  } else if (currentPlace === '森' || currentPlace === '洞窟') {
    // 森・洞窟で待機：10% + 層×2% の確率で敵出現
    let layer = placeLayers[currentPlace] || 0;
    let encounterChance = 0.05 + layer * 0.01; // 最大で約15%（layer=10時）
    if (random() < encounterChance) {
      showMessage(`待機中に気配を感じた……`);
      passTime(1);
      startBattle(currentPlace);
    } else {
      showMessage('待機した。');
      passTime(1);
      showMainActions();
    }
  } else {
    showMessage('待機した。');
    passTime(1);
    showMainActions();
  }
}

// =====================
// 時間経過
// =====================
function passTime(hours) {
  elapsedTime += hours;
  updateElapsedTime();
  for (let p in exploreCooldown) {
    exploreCooldown[p] = max(0, exploreCooldown[p] - hours);
  }
  // 焚火の燃料消費（1時間ごとに1燃料消費）
  if (hasCampfire) {
    campfireFuel -= hours;
    if (campfireFuel <= 0) {
      campfireFuel = 0;
      hasCampfire = false;
      // メッセージに追記
      let cur = textZone.html();
      showMessage(cur + '<br><span style="color:orange">⚠ 焚火の燃料が尽きた。</span>');
    }
  }
  if (player.mp <= 0) {
    player.hp -= 5 * hours;
    showMessage(textZone.html() + '<br><span style="color:tomato">気力が0なので体力が減少した。</span>');
  } else if (player.mp >= 40) {
    player.hp += 2 * hours;
  }
  player.hp = constrain(player.hp, 0, MAX_HP);
  player.mp = constrain(player.mp, 0, MAX_MP);
  updateParams();
  if (player.hp <= 0) {
    showMessage('体力が尽きた。ゲームオーバー。', true, () => gameOver());
  }
}

// =====================
// 戦闘：開始
// =====================
function startBattle(place) {
  let layer = placeLayers[place] || 0;
  // minLayer以下の敵のみ出現（層に応じた敵を絞り込む）
  let candidates = Object.keys(enemyTypes).filter(n =>
    enemyTypes[n].places.includes(place) && enemyTypes[n].minLayer <= layer
  );
  let name = random(candidates);
  let e = enemyTypes[name];

  // 層が上がるほど敵HPが増加（1層ごとに+2）
  let hpBonus = layer * 2;
  let baseHp = floor(random(e.hp[0], e.hp[1] + 1));

  battle.active     = true;
  battle.enemyName  = name;
  battle.enemyHp    = baseHp + hpBonus;
  battle.enemyMaxHp = baseHp + hpBonus;
  battle.enemyAtk   = e.atk;
  battle.enemyRange = e.range;
  battle.distance   = floor(random(2, 6)); // 2〜5
  battle.playerTurn = true;
  battle.place      = place;
  battle.turns      = 0;

  state = 'battle';
  updateBattleInfo();
  updateParams();
  showMessage(`${name}が現れた！（${layer+1}層　HP:${battle.enemyHp}）　距離：${battle.distance}`);
  showBattleActions();
}

// leftTop：戦闘情報
function updateBattleInfo() {
  let layer = placeLayers[battle.place] || 0;
  // 背景は戦闘場所の画像を維持
  updateBgImage(battle.place);
  // infoOverlayに戦闘情報を表示
  let overlay = select('#infoOverlay');
  if (overlay) {
    overlay.html(`
      <span class="info-badge" style="background:rgba(180,0,0,0.7)">⚔ 戦闘中 ／ ${battle.place} ${layer+1}層</span>
      <span class="info-badge">敵：${battle.enemyName}　HP: ${battle.enemyHp} / ${battle.enemyMaxHp}</span>
      <span class="info-badge">距離：${battle.distance}　${battle.playerTurn ? '【あなたのターン】' : '【敵のターン】'}</span>
    `);
  }
}

// =====================
// 戦闘：プレイヤーアクション表示
// =====================
function showBattleActions() {
  actionPanel.html('');

  // 前進（距離>1のとき有効）
  let btnFwd = createButton('前進').parent(actionPanel);
  if (battle.distance <= 1) btnFwd.attribute('disabled', 'true');
  btnFwd.mousePressed(() => playerBattleAction('forward'));

  // 距離6のとき後退→逃走に変える
  if (battle.distance >= 6) {
    createButton('逃走').parent(actionPanel)
      .mousePressed(() => playerBattleAction('escape'));
  } else {
    createButton('後退').parent(actionPanel)
      .mousePressed(() => playerBattleAction('backward'));
  }

  // 待機
  createButton('待機').parent(actionPanel).mousePressed(() => playerBattleAction('wait'));

  // 素手（距離1のみ）
  if (battle.distance <= 1) {
    createButton('素手（射程1, 攻撃力1）').parent(actionPanel)
      .mousePressed(() => playerBattleAction('attack', '素手', 1));
  }

  // 所持武器（射程が届くもののみ）
  for (let wName in weapons) {
    if ((itemCounts[wName] || 0) > 0) {
      let w = weapons[wName];
      let [rMin, rMax] = w.range;
      if (battle.distance >= rMin && battle.distance <= rMax) {
        let rangeLabel = rMin === rMax ? `${rMin}` : `${rMin}〜${rMax}`;
        createButton(`${wName}（射程${rangeLabel}, 攻撃力${w.atk}）`).parent(actionPanel)
          .mousePressed(() => playerBattleAction('attack', wName, w.atk));
      }
    }
  }
}

// =====================
// 戦闘：プレイヤー行動
// =====================
function playerBattleAction(type, weaponName, atk) {
  if (!battle.playerTurn) return;

  // 行動ごとに気力-1
  player.mp = constrain(player.mp - 1, 0, MAX_MP);
  battle.turns++;

  // 気力0で30%行動失敗（逃走は失敗しない）
  if (player.mp <= 0 && type !== 'escape' && Math.random() < 0.30) {
    battle.playerTurn = false;
    updateBattleInfo();
    updateParams();
    showMessage('気力が尽きて……行動に失敗した。', true, () => enemyBattleAction());
    return;
  }

  let msg = '';

  if (type === 'forward') {
    battle.distance--;
    msg = `前進した。距離：${battle.distance}`;
  } else if (type === 'backward') {
    battle.distance++;
    msg = `後退した。距離：${battle.distance}`;
  } else if (type === 'escape') {
    // 距離6で逃走成功→層を-1（0以下にはならない）
    battle.active = false;
    state = 'game';
    let escPlace = battle.place;
    if (escPlace === '森' || escPlace === '洞窟') {
      // 最高到達層-1に戻される（0以下にはならない）
      placeLayers[escPlace] = max(0, maxLayers[escPlace] - 1);
    }
    let escLayer = placeLayers[escPlace] || 0;
    showMessage(
      `逃走した！<br>追われながら引き返した。現在 ${escPlace} ${escLayer + 1}層。`,
      true,
      () => { updateElapsedTime(); updateParams(); showMainActions(); }
    );
    updateParams();
    return;
  } else if (type === 'wait') {
    msg = '待機した。';
  } else if (type === 'attack') {
    let dmg = atk + floor(random(0, 2)); // 攻撃力 + 0or1 のブレ
    battle.enemyHp -= dmg;
    msg = `${weaponName}で攻撃！${battle.enemyName}に ${dmg} ダメージ。`;
    if (battle.enemyHp <= 0) {
      battle.enemyHp = 0;
      updateBattleInfo();
      updateParams();
      // 敵を倒したのでクリック待ちでendBattleへ（敵行動は発生しない）
      showMessage(msg, true, () => endBattle(true));
      return;
    }
  }

  // プレイヤー行動後すぐ敵行動を計算し、1つにまとめて表示
  let { msg: enemyMsg, isDead } = calcEnemyAction();

  battle.playerTurn = true;
  updateBattleInfo();
  updateParams();

  // 自分の行動と敵の行動を1メッセージにまとめる
  let combined = msg + '<br><span style="color:#f88">▶ ' + enemyMsg + '</span>';

  if (isDead) {
    // HP0 → 必ずゲームオーバーへ（showBattleActionsを呼ばない）
    battle.active = false;
    state = 'gameover';
    showMessage(combined + '<br><span style="color:tomato">体力が尽きた……</span>', true, () => gameOver());
    return;
  }
  // クリック待ちなしで表示し、即プレイヤーターンへ
  showMessage(combined);
  showBattleActions();
}

// =====================
// 戦闘：敵行動の計算（結果をmsgで返す、副作用あり）
// =====================
function calcEnemyAction() {
  let msg = '';
  if (battle.distance <= battle.enemyRange) {
    // 射程内 → 攻撃
    let dmg = battle.enemyAtk + floor(random(0, 2));
    player.hp -= dmg;
    player.hp = max(0, player.hp);
    msg = `${battle.enemyName}の攻撃！${dmg} ダメージを受けた。`;
  } else {
    // 射程外：70%で前進、30%で様子見
    if (random() < 0.7) {
      battle.distance--;
      msg = `${battle.enemyName}が前進した。距離：${battle.distance}`;
    } else {
      msg = `${battle.enemyName}は様子を見ている。`;
    }
  }
  // 死亡フラグを返り値に含める
  return { msg, isDead: player.hp <= 0 };
}

// =====================
// 戦闘：終了（勝利）
// =====================
function endBattle(victory) {
  if (!victory) return;

  // 林ナオト戦専用処理
  if (battle.isNaoto) {
    battle.active = false;
    battle.isNaoto = false;
    state = 'game';
    labNaotoDead = true;
    addItem('カギのかけら');
    showMessage(
      '<span style="color:#ffd700;font-size:18px;font-weight:bold">林ナオト（変異体）を倒した。</span>',
      true,
      () => showMessage(
        '変異体は崩れ落ちた。<br>' +
        'その手から、壊れた鍵のかけらが落ちた。<br><br>' +
        '<span style="color:#adf">（カギのかけらを手に入れた）</span>',
        true,
        () => { updateElapsedTime(); updateParams(); showMainActions(); }
      )
    );
    updateParams();
    return;
  }

  let e = enemyTypes[battle.enemyName];
  let place = battle.place;
  let layer = placeLayers[place] || 0;

  // 層が上がるほどドロップ量が増加
  let dropBonus = floor(layer / 2); // 2層ごとにドロップ+1
  let drops = [];
  for (let d of e.drops) {
    // ボーナス分追加でドロップ判定
    let times = 1 + dropBonus;
    for (let i = 0; i < times; i++) {
      if (random() < d.chance) {
        addItem(d.item);
        drops.push(d.item);
      }
    }
  }

  // 撃破カウント増加
  let placeKey = battle.place;
  placeKillCounts[placeKey] = (placeKillCounts[placeKey] || 0) + 1;

  let layerUpped = false;
  // 2体倒すごとに層UP
  if (placeKillCounts[placeKey] >= 2) {
    placeKillCounts[placeKey] = 0;
    placeLayers[place] = layer + 1;
    maxLayers[place] = max(maxLayers[place], placeLayers[place]);
    // クールダウンリセット
    exploreCooldown[place] = 0;
    exploreCounts[place] = 0;
    layerUpped = true;
  }

  let dropMsg = drops.length > 0 ? `ドロップ：${drops.join('、')}` : 'ドロップなし';
  let nextLayer = placeLayers[place] + 1;

  // ターン数/4 時間経過（回復なし）
  let timePassed = Math.max(1, Math.floor(battle.turns / 4));
  elapsedTime += timePassed;
  // クールダウン減少（通常のpassTimeは使わない＝回復なし）
  for (let p in exploreCooldown) {
    exploreCooldown[p] = max(0, exploreCooldown[p] - timePassed);
  }
  if (hasCampfire) {
    campfireFuel -= timePassed;
    if (campfireFuel <= 0) { campfireFuel = 0; hasCampfire = false; }
  }
  updateElapsedTime();

  battle.active = false;
  state = 'game';

  // 段階1：倒した演出（クリックでドロップ表示へ）
  showMessage(
    `<span style="color:#ffd700;font-size:18px;font-weight:bold">⚔ ${battle.enemyName}を倒した！</span>`,
    true,
    () => {
      // 段階2：ドロップ一覧表示（クリックでメインへ）
      let dropListHtml = drops.length > 0
        ? drops.map(d => `<div class="drop-item">✦ ${d}</div>`).join('')
        : '<div style="color:#aaa">ドロップなし</div>';
      showMessage(
        `<div style="margin-bottom:6px"><b>ドロップアイテム</b></div>` +
        dropListHtml +
        `<div style="margin-top:8px;color:#aaa;font-size:13px">戦闘時間：${timePassed}時間経過${layerUpped ? `　${place} → ${nextLayer}層へ` : ''}</div>`,
        true,
        () => {
          updateElapsedTime();
          updateParams();
          showMainActions();
        }
      );
    }
  );
  updateParams();
}


// =====================
// ケイ（森での会話）
// =====================
const keiDialogs = [
  // 1回目：初対面
  [
    '……人間？本当に人間？',
    'よかった。10日ぶりに人の声を聞いた。',
    'あなたも船から？　あの船、おかしかった。',
    '出発前に港で、林って人に話しかけられなかった？',
  ],
  // 2回目
  [
    '洞窟の奥から機械の音がする。',
    '誰かがまだいると思う。でも……怖くて近づけなかった。',
    'この島、地図にないんだよ。調べたから。',
    'なんで私たち、ここに来たんだろう。',
  ],
  // 3回目
  [
    '林って人、出発の前日も港にいたんだ。',
    '乗客に声かけて回ってた。',
    'あの船に乗せたかったのかな、誰かを。',
    '……それとも、乗せたくなかったのかな。',
    '（ケイとの信頼が深まった）',
  ],
];

function talkToKei() {
  if (keiState === 'unknown') return;
  if (keiTalkCount >= 3) {
    showMessage('ケイ「……また話しかけてくれてありがとう。でも、もう伝えることは全部話した気がする。」');
    return;
  }
  // 初回は「会った」フラグを立てる
  if (keiState === 'forest_reachable') keiState = 'met';

  let lines = keiDialogs[keiTalkCount];
  keiTalkCount++;

  // 台詞を順番にクリック待ちで表示
  showKeiLines(lines, 0, () => {
    // 3回目でフラグ成立
    if (keiTalkCount >= 3) {
      showMessage(
        'ケイとの信頼が深まった。<br>' +
        '<span style="color:#adf">（同行脱出フラグ成立）</span>'
      );
    }
    showMainActions();
  });
}

// ケイの台詞を1行ずつ表示
function showKeiLines(lines, idx, onDone) {
  if (idx >= lines.length) { onDone(); return; }
  let prefix = idx < lines.length - 1 || keiTalkCount < 3 ? 'ケイ「' : '';
  let suffix = idx < lines.length - 1 || keiTalkCount < 3 ? '」' : '';
  let isLast = (idx === lines.length - 1);
  showMessage(
    `${prefix}${lines[idx]}${suffix}`,
    true,
    () => showKeiLines(lines, idx + 1, onDone)
  );
}

// =====================
// ケイ（広場合流後の会話）：ランダム世間話
// =====================
const keiPlazaRandomTalks = [
  // 焚火関連
  { cond: () => hasCampfire && campfireFuel > 0,
    lines: ['ケイ：焚火、いいですね。', '少し落ち着きます。'] },
  { cond: () => hasCampfire && campfireFuel <= 2,
    lines: ['ケイ：焚火、消えそうですね。', '燃料、補充した方がいいかも。'] },
  // アイテム多め
  { cond: () => Object.keys(itemCounts).length >= 8,
    lines: ['ケイ：荷物、だいぶ増えましたね。', '僕も何か手伝えればよかったんですけど。'] },
  // 洞窟未探索
  { cond: () => placeLayers['洞窟'] === 0,
    lines: ['ケイ：洞窟、まだ入ってないんですか？', '音がするって言ってたんで……気になってて。'] },
  // 洞窟探索中
  { cond: () => placeLayers['洞窟'] >= 3,
    lines: ['ケイ：洞窟、けっこう深くまで行ったんですね。', '気をつけてください。何かいる気がします。'] },
  // 研究所解放済み
  { cond: () => labUnlocked,
    lines: ['ケイ：研究所……行きました？', 'あそこに、全部の答えがあると思うんです。'] },
  // 時間経過
  { cond: () => elapsedTime >= 80,
    lines: ['ケイ：もうそんなに時間が経ったんですね。', '早く出ないと、どんどん遅くなる気がして。'] },
  // デフォルト
  { cond: () => true,
    lines: ['ケイ：……空、きれいですね。', 'こんな状況じゃなければ、もっと楽しめたのに。'] },
];

function talkToKeiPlaza() {
  let candidates = keiPlazaRandomTalks.filter(t => t.cond());
  let talk = random(candidates);
  showPortrait('kei');
  showKeiLines(talk.lines, 0, () => { hidePortrait(); showMainActions(); });
}



// =====================
// 研究所：部屋データ
// =====================

// 部屋ごとの説明
const labRoomDescriptions = {
  '廊下': '薄暗い廊下。非常灯がかすかに点滅している。金属の壁には錆と染みが広がっている。',
  '研究室': '実験用の機器が並ぶ部屋。ホコリをかぶった端末が一台、まだ起動しているようだ。',
  '実験室': 'ガラス張りの水槽が並ぶ部屋。水は濁り、異臭がする。床に割れたビーカーが散乱している。',
  '倉庫': '備品が雑然と積まれた倉庫。棚が倒れ、床には何かが引きずられた跡がある。',
};

// ケイの部屋ごとのセリフ
const keiLabDialogs = {
  '廊下': [
    'ケイ：「……ここが研究所か。思ったより広い。」',
    'ケイ：「非常灯がまだ生きてる。電源がどこかで動いてるってことだよな。」',
    'ケイ：「そのカギのかけら……接着剤とかで修復できないか？<br>何か材料があれば、鍵として使えるかもしれない。」',
  ],
  '研究室': [
    'ケイ：「PCがまだ動いてる。すごいな、バッテリーか何かで動いてるのか。」',
    'ケイ：「パスワードがかかってる。……何か手がかりになるものはないかな。」',
    'ケイ：「林って人のことが書いてあるかもしれない。」',
  ],
  '実験室': [
    'ケイ：「この水槽……何を入れてたんだ。」',
    'ケイ：「記録が残ってるな。読むのが怖い気もするけど。」',
    'ケイ：「ここで何かが育てられてたってこと？　あのボスも……？」',
  ],
  '倉庫': [
    'ケイ：「何かを運び出した跡がある。誰かがここを使ってたのか。」',
    'ケイ：「この棚の裏……何か隠してあるんじゃないか。」',
    'ケイ：「備品の中に使えるものがあるかもしれない。探してみよう。」',
  ],
};
let keiLabTalkCounts = { '廊下': 0, '研究室': 0, '実験室': 0, '倉庫': 0 };

// 部屋ごとの資料テキスト
const labDocuments = {
  '廊下': `<b>【廊下の壁の落書き】</b><br>
「もう帰れない　2014.4」<br><br>
<b>【非常口案内板（錆びて読みにくい）】</b><br>
第一研究棟：廊下 → 研究室 → 実験室<br>
第二研究棟：倉庫 → ……（判読不能）<br>
緊急時は第二研究棟倉庫の備品を使用のこと`,

  '研究室': `<b>【机の上のメモ（手書き）】</b><br>
「パスワードは私が最初に選んだ数字。<br>
研究を始めた日のこと、覚えているか。<br>
ユキが死んだあの年の、3月1日。<br>
そこに私の番号を足せ。」<br><br>
<b>【端末ログイン画面】</b><br>
TIDALWAVE INSTITUTE TERMINAL<br>
Password: ______<br>
※6桁の数字で入力`,

  '実験室': `<b>【実験ログ（印刷物・水濡れ）】</b><br>
プロジェクト：TIDAL　経過報告 第17回<br>
被験者：篠原マスミ（No.3）松下トオル（No.4）<br>
　　　　立川サユ（No.5）二條カズトモ（No.6）<br><br>
No.3：海中適応率71%。感情の平坦化が見られる。<br>
No.4：海中適応率88%。水への依存が強まっている。<br>
No.6：海中適応率79%。攻撃性の上昇。隔離を推奨。<br><br>
備考：No.7より被験者との個人的な接触を禁ずる旨の通達あり。<br>
<span style="color:#aaa">※No.7とは誰か、この時点ではわからない</span>`,

  '倉庫': `<b>【棚の張り紙】</b><br>
緊急備品リスト<br>
・フレアガン（残弾2）<br>
・非常食（消費期限不明）<br>
・救急キット<br><br>
<b>【床に落ちたメモ】</b><br>
「フレアガンは奥の棚の裏。<br>
いざというときのために残した。　—N」`,
};

// =====================
// 研究所：移動
// =====================
function moveToLab(room) {
  if (room === '研究室' && !labHasKey && !(itemCounts['研究室の鍵'] > 0)) {
    showMessage('研究室は鍵がかかっている。どこかに鍵があるはずだ。');
    return;
  }
  // 研究室の鍵を持っていれば消費して開錠
  if (room === '研究室' && !labHasKey && itemCounts['研究室の鍵'] > 0) {
    labHasKey = true;
    itemCounts['研究室の鍵']--;
    if (itemCounts['研究室の鍵'] <= 0) delete itemCounts['研究室の鍵'];
    showMessage('研究室の鍵で扉を開けた。');
  }
  currentRoom = room;
  exploreCooldown[room] = exploreCooldown[room] || 0;
  exploreCounts[room]   = exploreCounts[room]   || 0;
  exploreCooldown[room] = 0;
  exploreCounts[room]   = 0;
  passTime(1);

  // 廊下：林ナオトイベント
  if (room === '廊下') {
    updateBgImage('洞窟'); // 廊下は洞窟背景を流用
    if (!labNaotoMet && elapsedTime < 150) {
      labNaotoMet = true;
      // 真相→自害→カギのかけらドロップの流れ
      showPortrait('naoto');
      showMessage(
        '廊下の奥から、ゆっくりと足音が近づいてきた。<br>' +
        '痩せ細った男が壁に寄りかかって立っていた。',
        true,
        () => showMessage(
          '林ナオト：……来たのか。ここまで来るとは思わなかった。<br>' +
          '私は林ナオト。この研究所を作った人間だ。',
          true,
          () => showMessage(
            '林ナオト：妹のユキが海で死んだ。だから作った。海で死なない人間を。<br>' +
            '間違っていた。彼らを人として扱わなかった。',
            true,
            () => showMessage(
              '林ナオト：あなたの船を沈めたのも、私だ。サンプルが漏れると思って……<br>' +
              '全部、私のせいだ。',
              true,
              () => showMessage(
                '林ナオト：これを持っていけ。記録が残っている。全部読んでくれ。<br><br>' +
                'ナオトは壁に背を預け、静かに目を閉じた。<br>' +
                'その手から、壊れた鍵のかけらが床に落ちた。<br>' +
                '……もう、動かなかった。',
                true,
                () => {
                  hidePortrait();
                  labNaotoDead = true;
                  addItem('カギのかけら');
                  showMessage(
                    '<span style="color:var(--accent)">（カギのかけらを入手した）</span>',
                    false, null
                  );
                  updateParams();
                  showMainActions();
                }
              )
            )
          )
        )
      );
      return;
    } else if (!labNaotoMet && elapsedTime >= 150) {
      labNaotoMet = true;
      showPortrait('naoto');
      showMessage(
        '廊下の奥で何かが動く気配がした。<br>' +
        '振り返ると——人だったものが、こちらを向いていた。<br>' +
        'かつては林ナオトだったその姿は、すでに人の形をほとんどとどめていなかった。',
        true,
        () => { hidePortrait(); startBattleNaoto(); }
      );
      return;
    } else if (labNaotoMet && !labNaotoDead) {
      // 逃走後に戻ってきた場合：再戦
      showMessage(
        '廊下に変異体がまだいる。<br>',
        true,
        () => startBattleNaoto()
      );
      return;
    }
  }

  updateBgImage('洞窟');
  updateElapsedTime();
  updateParams();
  showMainActions();
}

// 林ナオト戦（廊下で150時間後）
function startBattleNaoto() {
  battle.active     = true;
  battle.enemyName  = '林ナオト（変異体）';
  battle.isNaoto    = true;
  battle.enemyHp    = 30;
  battle.enemyMaxHp = 30;
  battle.enemyAtk   = 8;
  battle.enemyRange = 2;
  battle.distance   = 3;
  battle.playerTurn = true;
  battle.place      = '廊下';
  state = 'battle';
  updateBattleInfo();
  updateParams();
  showMessage('林ナオト（変異体）が現れた！　距離：3', false);
  showBattleActions();
}

// =====================
// 研究所：メインアクション（上書き）
// =====================
function showLabActions() {
  if (messageWaiting) return;
  actionPanel.html('');
  let desc = labRoomDescriptions[currentRoom] || '';
  showMessage(`【研究所：${currentRoom}】　${desc}`);

  createButton('探索').parent(actionPanel).mousePressed(() => explorelab(currentRoom));
  createButton('移動').parent(actionPanel).mousePressed(() => showMoveOptions());
  createButton('待機').parent(actionPanel).mousePressed(() => waitAction());

  // 資料ボタン
  if (labDocuments[currentRoom]) {
    createButton('資料').parent(actionPanel).mousePressed(() => {
      showMessage(labDocuments[currentRoom], true, () => showLabActions());
    });
  }

  // 研究室PCパスワード
  if (currentRoom === '研究室') {
    createButton('PCを操作').parent(actionPanel).mousePressed(() => showPasswordInput());
  }

  // ケイ会話（合流済みの場合）
  if (keiState === 'plaza' && keiLabTalkCounts[currentRoom] < keiLabDialogs[currentRoom].length) {
    let btn = createButton('会話：ケイ').parent(actionPanel);
    btn.style('background-color', 'var(--bg-raised)');
    btn.style('border-color', 'var(--accent-dim)');
    btn.style('color', 'var(--accent)');
    btn.mousePressed(() => {
      let idx = keiLabTalkCounts[currentRoom];
      keiLabTalkCounts[currentRoom]++;
      showMessage(keiLabDialogs[currentRoom][idx], true, () => showLabActions());
    });
  }
}

// =====================
// 研究所：探索
// =====================
function explorelab(room) {
  if ((exploreCooldown[room] || 0) > 0) {
    showMessage(`ここからはこれ以上何も見つからなさそうだ。<br>時間を置いてみよう。`);
    return;
  }

  exploreCounts[room] = (exploreCounts[room] || 0) + 1;
  passTime(1);
  player.mp = constrain(player.mp - 1, 0, MAX_MP);
  updateParams();

  if ((exploreCounts[room] || 0) >= EXPLORE_LIMIT) {
    exploreCooldown[room] = 5;
    exploreCounts[room]   = 0;
  }

  // 実験室初探索：接着剤のもと入手＋接着剤レシピ解放
  if (room === '実験室' && !labGlueMaterialTaken) {
    labGlueMaterialTaken = true;
    addItem('接着剤のもと');
    // 接着剤レシピを解放（蛇の皮が必要であることをメッセージで示す）
    showMessage(
      '実験室の棚に見慣れない容器を見つけた。ラベルには「有機接着剤原料」とある。<br>' +
      '<span style="color:#adf">（「接着剤のもと」を入手した）</span><br>' +
      '<span style="color:#adf">（接着剤のレシピを覚えた：蛇の皮＋接着剤のもと）</span>'
    );
    updateParams();
    return;
  }

  // 研究所は戦闘確率低め（5%）
  let rand = random();
  if (rand < 0.05) {
    startBattle('洞窟'); // 研究所の敵は洞窟系で代用
    return;
  }

  // 倉庫：特別武器（1回のみ）
  if (room === '倉庫' && !labGunTaken && rand < 0.50) {
    labGunTaken = true;
    addItem('フレアガン');
    showMessage('棚の裏に古びたケースを発見した。中に<b>フレアガン</b>が入っていた！<br>射程3〜5、攻撃力4。');
    updateParams();
    return;
  }

  // 部屋ごとのアイテムプール
  let item = getLabItem(room);
  if (item) {
    addItem(item);
    showMessage(`【${room}】を探索して「${item}」を入手した。`);
  } else {
    showMessage(`【${room}】を探索したが、何も見つからなかった。`);
  }
  updateParams();
}

function getLabItem(room) {
  const pools = {
    '廊下':  ['救急キット', '骨', '石', null],
    '研究室': ['薬草', '貴重な薬草', '研究メモ', null, null],
    '実験室': ['毒の牙', '薬草', '骨', '実験記録', null],
    '倉庫':  ['石', '鉄鉱石', '非常食', null],
  };
  let pool = pools[room] || [null];
  return random(pool);
}

// =====================
// 研究室PC：パスワード入力
// =====================
function showPasswordInput() {
  actionPanel.html('');
  showMessage('端末にパスワードを入力してください。（6桁の数字）');

  let input = createElement('input');
  input.attribute('type', 'text');
  input.attribute('maxlength', '6');
  input.attribute('placeholder', '000000');
  input.style('font-size', '18px');
  input.style('padding', '6px 10px');
  input.style('background', 'var(--bg-deep)');
  input.style('color', 'var(--text-primary)');
  input.style('border', '1px solid var(--border)');
  input.style('border-radius', '2px');
  input.style('width', '120px');
  input.style('text-align', 'center');
  input.parent(actionPanel);

  createButton('入力').parent(actionPanel).mousePressed(() => {
    let val = input.value().trim();
    checkPassword(val);
  });
  createButton('戻る').parent(actionPanel)
    .style('background-color', 'var(--bg-raised)')
    .mousePressed(() => showLabActions());
}

function checkPassword(val) {
  // 正解：200431（2004年3月1日 + No.7）
  if (val === '200431') {
    showMessage(
      '<b>【端末：アクセス許可】</b><br><br>' +
      'プロジェクトTIDALの真の目的：<br>' +
      '極限環境下での生存能力を持つ人間の量産。<br>' +
      '発注元：——省　極秘予算より拠出。<br><br>' +
      '被験者は全員、ある共通点を持つ人間から選ばれた。<br>' +
      '家族がいない。誰にも探されない。<br><br>' +
      '私は自分でも被験者になった。（No.7、自己投与　2013年8月）<br>' +
      '彼らをもっと理解したかった。<br><br>' +
      'この記録を外に持ち出してほしい。<br>' +
      '——製薬はもうない。でも発注した側はまだいる。<br>' +
      'これが証拠になる。<br><br>' +
      'ユキ、ごめん。',
      true,
      () => {
        addItem('研究所の記録');
        showMessage('<span style="color:#adf">（「研究所の記録」を入手した。これが謎解きルートのクリアアイテムだ）</span>', true, () => showLabActions());
      }
    );
  } else {
    showMessage('パスワードが違う。', true, () => showPasswordInput());
  }
}


// =====================
// 立ち絵表示
// =====================
function showPortrait(who) {
  // whoは 'kei'→s01.png、'naoto'→s02.png
  let fileMap = { kei: 's01.png', naoto: 's02.png' };
  let file = fileMap[who];
  if (!file) return;
  let existing = select('#portrait');
  if (existing) existing.remove();
  let img = createImg(file, who);
  img.id('portrait');
  img.parent(leftWindow);
  img.style('position', 'absolute');
  img.style('bottom', 'calc(40% + 10px)');
  img.style('left', '20px');
  img.style('height', '200px');
  img.style('width', 'auto');
  img.style('z-index', '15');
  img.style('pointer-events', 'none');
  img.style('opacity', '0');
  img.style('transition', 'opacity 0.3s');
  setTimeout(() => { img.style('opacity', '1'); }, 10);
}

function hidePortrait() {
  let p = select('#portrait');
  if (p) {
    p.style('opacity', '0');
    setTimeout(() => { if (select('#portrait')) select('#portrait').remove(); }, 300);
  }
}
// =====================
// セーブ＆ロード
// =====================
function saveGame() {
  if (battle.active) { showMessage('戦闘中はセーブできません。'); return; }
  try {
    const data = {
      player:              JSON.parse(JSON.stringify(player)),
      elapsedTime,
      exploreCounts:       JSON.parse(JSON.stringify(exploreCounts)),
      exploreCooldown:     JSON.parse(JSON.stringify(exploreCooldown)),
      currentPlace,
      placeLayers:         JSON.parse(JSON.stringify(placeLayers)),
      maxLayers:           JSON.parse(JSON.stringify(maxLayers)),
      itemCounts:          JSON.parse(JSON.stringify(itemCounts)),
      hasCampfire, campfireFuel, hasRaft,
      keiState, keiTalkCount, forest8EventDone, keiHealDone, keiPlazaArrived,
      forest3EventDone,
      labUnlocked, labHasKey, labGunTaken, labNaotoMet, labNaotoDead,
      labGlueMaterialTaken, currentRoom,
      keiLabTalkCounts: JSON.parse(JSON.stringify(keiLabTalkCounts)),
    };
    localStorage.setItem('savedata', JSON.stringify(data));
    showMessage('セーブしました。（経過時間：' + elapsedTime + '時間）');
    updateParams(); // セーブボタンの状態更新
  } catch(e) {
    showMessage('セーブに失敗しました：' + e.message);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('savedata');
    if (!raw) { showMessage('セーブデータがありません。'); return false; }
    const d = JSON.parse(raw);
    player.hp    = d.player.hp;
    player.mp    = d.player.mp;
    elapsedTime  = d.elapsedTime;
    Object.assign(exploreCounts,   d.exploreCounts   || {});
    Object.assign(exploreCooldown, d.exploreCooldown || {});
    currentPlace = d.currentPlace;
    Object.assign(placeLayers, d.placeLayers || {});
    Object.assign(maxLayers,   d.maxLayers   || {});
    // itemCountsは完全置換
    for (let k in itemCounts) delete itemCounts[k];
    Object.assign(itemCounts, d.itemCounts || {});
    hasCampfire          = !!d.hasCampfire;
    campfireFuel         = d.campfireFuel   || 0;
    hasRaft              = !!d.hasRaft;
    selectedItem         = null;
    keiState             = d.keiState             || 'unknown';
    keiTalkCount         = d.keiTalkCount         || 0;
    forest8EventDone     = !!d.forest8EventDone;
    keiHealDone          = !!d.keiHealDone;
    keiPlazaArrived      = !!d.keiPlazaArrived;
    forest3EventDone     = !!d.forest3EventDone;
    labUnlocked          = !!d.labUnlocked;
    labHasKey            = !!d.labHasKey;
    labGunTaken          = !!d.labGunTaken;
    labNaotoMet          = !!d.labNaotoMet;
    labNaotoDead         = !!d.labNaotoDead;
    labGlueMaterialTaken = !!d.labGlueMaterialTaken;
    currentRoom          = d.currentRoom || null;
    if (d.keiLabTalkCounts) Object.assign(keiLabTalkCounts, d.keiLabTalkCounts);
    return true;
  } catch(e) {
    showMessage('ロードに失敗しました：' + e.message);
    return false;
  }
}

// ロード後に画面を再構築
function loadAndRefresh() {
  if (loadGame()) {
    state = 'game';
    updateBgImage(currentRoom ? '洞窟' : currentPlace);
    updateElapsedTime();
    updateParams();
    showMainActions();
  }
}

// =====================
// ゲームオーバー
// =====================
function gameOver() {
  state = 'gameover';
  battle.active = false;
  clearUI();
  container.html('');
  let overDiv = createDiv().parent(container);
  overDiv.elt.style.cssText = `
    width:100%; height:100%;
    display:flex; flex-direction:column;
    justify-content:center; align-items:center;
    background: radial-gradient(ellipse at center, #2a0a0a 0%, #0d0000 70%);
  `;
  createDiv().parent(overDiv).html(
    '<div style="font-family:Cinzel,serif;font-size:clamp(36px,6vw,72px);color:#c0503a;letter-spacing:0.15em;text-shadow:0 0 30px rgba(192,80,58,0.8)">GAME OVER</div>'
  );
  createDiv().parent(overDiv).html(
    `<div style="color:#7a5550;font-size:clamp(14px,2vw,20px);margin-top:16px">経過時間：${elapsedTime} 時間</div>`
  );
  let btn = createButton('タイトルに戻る').parent(overDiv);
  btn.elt.style.cssText = 'margin-top:40px;font-size:clamp(14px,2vw,20px);padding:14px 40px;background:transparent;border:1px solid #7a5550;color:#c0503a;cursor:pointer;letter-spacing:0.1em;';
  btn.mousePressed(() => location.reload());
}

function clearUI() {
  leftWindow.remove();
  rightWindow.remove();
}


setup();
