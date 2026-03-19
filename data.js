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
  'どこかの鍵':'修復した鍵。研究室の扉が開けられそうだ。',
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
let player = { hp: 100, mp: 80 };
const MAX_HP = 100;
const MAX_MP = 80;

// =====================
// ゲーム状態
// =====================
let state = 'opening'; // opening, game, battle, gameover
let elapsedTime = 0;

// =====================
// 探索・層管理
// =====================
const EXPLORE_LIMIT = 10;
const MAX_FOREST_LAYER = 10; // 森の最大層
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
let hasLabRecord = false;     // 研究所の記録を持っているか（謎解きルート条件）

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
  '肉と薬草の包み': { req: { '狼の肉': 1, '薬草': 1 },                  time: 1 },
  // 体力+15 / 気力+15（火なし）
  '薬草スープ':   { req: { '薬草': 2, '骨': 1 },                         time: 1 },
  '万能薬':       { req: { '貴重な薬草': 1, '宝石': 1 },                 time: 2 },

  // --- 研究所系（実験室探索後に解放） ---
  '接着剤':       { req: { '蛇の皮': 1, '接着剤のもと': 1 },             time: 1, labOnly: true },
  'どこかの鍵':   { req: { 'カギのかけら': 1, '接着剤': 1 },             time: 1, labOnly: true },
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
  // ===== 森・広場 =====
  'うさぎ': {
    hp: [6, 9], atk: 3, range: 1, minLayer: 0,
    desc: '茶色い野うさぎ。普段は臆病だが、追い詰めると鋭い前歯で噛みついてくる。目が真っ赤で、どこかおかしい。',
    atkDesc: ['噛みついた', '前足で引っかいた', '体当たりしてきた'],
    drops: [
      { item: 'うさぎ肉', chance: 0.8 },
      { item: '骨',       chance: 0.5 },
    ],
    places: ['森', '広場'],
  },
  'おおかみ': {
    hp: [12, 18], atk: 6, range: 1, minLayer: 0,
    desc: '大型の野生の狼。群れからはぐれたのか単独で行動している。低くうなり声を上げながらこちらを威嚇してくる。牙が異様に鋭い。',
    atkDesc: ['牙で噛みついた', '爪で引っかいた', '体ごとぶつかってきた', 'のど元を狙ってきた'],
    drops: [
      { item: '牙',     chance: 0.8 },
      { item: '狼の肉', chance: 0.7 },
      { item: '骨',     chance: 0.5 },
    ],
    places: ['森'],
  },
  // ===== 洞窟（浅層） =====
  'コウモリ': {
    hp: [8, 12], atk: 4, range: 1, minLayer: 0,
    desc: '天井から音もなく降ってきた大型のコウモリ。翼開長は1メートル近い。超音波で攻撃してくるのか、近づくと頭が痛くなる。',
    atkDesc: ['翼で叩いてきた', '爪で引っかいた', '超音波を浴びせてきた'],
    drops: [
      { item: '翼の膜', chance: 0.7 },
      { item: '骨',     chance: 0.5 },
    ],
    places: ['洞窟'],
  },
  // ===== 森深層（layer>=3） =====
  'リス（狙撃型）': {
    hp: [10, 14], atk: 5, range: 3, minLayer: 3,
    desc: '木の上から木の実や小石を正確に投げてくる。素早く木の上に逃げるため接近が難しい。目が異様に大きく、暗所でも正確に狙ってくる。',
    atkDesc: ['木の上から石を投げてきた', '木の実を勢いよく投げつけてきた', '木の枝を折って投げてきた'],
    drops: [
      { item: '牙', chance: 0.6 },
      { item: '骨', chance: 0.5 },
    ],
    places: ['森'],
  },
  // ===== 洞窟深層（layer>=3） =====
  '岩トカゲ': {
    hp: [12, 16], atk: 3, range: 4, minLayer: 3,
    desc: '体長1メートルほどの大型トカゲ。岩の色に溶け込むため発見が遅れた。尻尾を鞭のように使って遠距離から攻撃してくる。鱗が硬い。',
    atkDesc: ['尻尾を鞭のように振り回してきた', '石つぶてを吐き出してきた', '長い舌で引っ叩いてきた'],
    drops: [
      { item: '石',      chance: 0.9 },
      { item: '鉄鉱石', chance: 0.5 },
    ],
    places: ['洞窟'],
  },
  // ===== 深層（layer>=6） =====
  '毒ヘビ': {
    hp: [15, 22], atk: 7, range: 3, minLayer: 6,
    special: 'snake',
    firstDrop: '蛇の皮',
    desc: '体長2メートルを超える太い毒ヘビ。動きが速く、気づいたときには距離を詰められている。巻き付かれると身動きが取れなくなる。牙から黄緑色の液体が滴っている。',
    atkDesc: ['毒牙で噛みついた', '巻き付いてきた', '体当たりしてきた', '尾で叩いてきた'],
    drops: [
      { item: '蛇の皮',    chance: 0.6 },
      { item: '毒の牙',     chance: 0.8 },
      { item: '貴重な薬草', chance: 0.4 },
    ],
    places: ['森', '洞窟'],
  },
  '変異ヤマアラシ': {
    hp: [18, 25], atk: 7, range: 4, minLayer: 6,
    desc: '異常に巨大化したヤマアラシ。体中の針を弓矢のように発射してくる。近づくだけで針が刺さる。島の何かに影響されて変異したのかもしれない。',
    atkDesc: ['針を発射してきた', '体の針が刺さった', '鋭い爪で引っかいた'],
    drops: [
      { item: '鉄鉱石', chance: 0.8 },
      { item: '純鉄',   chance: 0.4 },
    ],
    places: ['洞窟'],
  },

  // ===== 研究所エネミー（special: 'lab'） =====
  'ウミウシ（変異体）': {
    hp: [8, 12], atk: 2, range: 1, minLayer: 0,
    special: 'lab_flee',  // ひたすら逃げる
    desc: '研究所の水槽から逃げ出したらしい。体長50cmほどで、全身が発光している。攻撃力は低いが、すぐに距離を取ろうとする。食べ物を与えると動きが止まる。',
    atkDesc: ['粘液を飛ばしてきた', '体当たりしてきた'],
    drops: [
      { item: '薬草', chance: 0.6 },
      { item: '貴重な薬草', chance: 0.2 },
    ],
    places: ['廊下', '実験室', '倉庫'],
  },
  'アンコウ（変異体）': {
    hp: [14, 18], atk: 5, range: 1, minLayer: 0,
    special: 'lab_rush',  // 一気に距離を詰める
    desc: '研究所で作られた深海魚の変異体。頭部の発光器官で獲物を誘い込み、一気に飛びかかってくる。動きは遅いが、攻撃が当たると痛い。食べ物を与えると動きが鈍くなる。',
    atkDesc: ['大きな顎で噛みついた', '発光で目くらましした', '頭突きしてきた'],
    drops: [
      { item: '骨', chance: 0.7 },
      { item: '毒の牙', chance: 0.3 },
    ],
    places: ['廊下', '研究室', '実験室', '倉庫'],
  },
  'タコ（変異体）': {
    hp: [10, 15], atk: 4, range: 3, minLayer: 0,
    special: 'lab_ranged',  // 距離2を保って遠距離攻撃
    desc: '壁を這う2メートル級のタコ。触手を伸ばして遠距離から攻撃してくる。距離2を保って絶対に近づかない。食べ物を投げると気が散って動きが止まる。',
    atkDesc: ['触手を伸ばして叩いてきた', '墨を吐きかけてきた', '触手で締め付けてきた'],
    drops: [
      { item: '翼の膜', chance: 0.5 },  // 触手の膜
      { item: '薬草', chance: 0.4 },
    ],
    places: ['廊下', '研究室', '実験室', '倉庫'],
  },
};

// モンスター画像マップを更新（名前変更分）


// =====================
// 戦闘状態
// =====================

// =====================
// ボタン：アイコン＆カラー設定
// =====================

// =====================
// 焼けるアイテム（焚火使用時）
// =====================
const grillTable = {
  'うさぎ肉':  { result: '焼きうさぎ', fuel: 1 },
  '狼の肉':    { result: '焼き狼肉',   fuel: 1 },
  '小果実':    { result: '焼き果実',   fuel: 1 },
  'りんご':    { result: '焼きりんご', fuel: 1 },
};

// 焼いた後のアイテムの回復効果（foodTableに追加）
// ※ useItem内のfoodTableと同期させること
const grilledFoodStats = {
  '焼きうさぎ':  { hp: 20, mp: 20 },
  '焼き狼肉':    { hp: 30, mp: 25 },
  '焼き果実':    { hp: 5,  mp: 15 },
  '焼きりんご':  { hp: 10, mp: 15 },
};

// =====================
// モンスター画像マップ
// =====================
const monsterImages = {
  'うさぎ':           'monster/usagi.png',
  'おおかみ':         'monster/ookami.png',
  'コウモリ':         'monster/koumori.png',
  'リス（狙撃型）':   'monster/risu.png',
  '岩トカゲ':         'monster/tokage.png',
  '毒ヘビ':           'monster/hebi.png',
  '変異ヤマアラシ':   'monster/yamaarashi.png',
  'ウミウシ（変異体）':'monster/umiu.png',
  'アンコウ（変異体）':'monster/ankou.png',
  'タコ（変異体）':   'monster/tako.png',
  '林ナオト（変異体）':'monster/naoto.png',
};

// =====================
// アイテムアイコン
// =====================
const itemIcons = {
  '木の枝':       '🪵', '草':           '🌿', '石':           '🪨',
  '木材':         '🪵', '小果実':       '🫐', 'りんご':       '🍎',
  'うさぎ肉':     '🥩', '狼の肉':       '🥩', '干し肉':       '🍖',
  '肉と薬草の包み':'🌯', '薬草スープ':   '🍵', '万能薬':       '💊',
  '焼きうさぎ':   '🍗', '焼き狼肉':     '🍖', '焼き果実':     '🍊',
  '焼きりんご':   '🍎', '薬草':         '🌿', '救急キット':   '🩹',
  '非常食':       '🥫', '骨':           '🦴', '牙':           '🦷',
  '翼の膜':       '🪽', '毒の牙':       '☠️', '蛇の皮':       '🐍',
  '鉄鉱石':       '⛏️', '純鉄':         '🔩', '大きな木材':   '🪵',
  '特別な木材':   '🪵', '貴重な薬草':   '✨', '宝石':         '💎',
  '接着剤のもと': '🧪', '接着剤':       '🧴', 'カギのかけら': '🗝️',
  'どこかの鍵':   '🔑', '研究メモ':     '📄', '実験記録':     '📋',
  'フレアガン':   '🔫', 'トランシーバー':'📡', '研究所の記録': '📁',
  'パチンコ':     '🏹', '木の棒':       '🪃', '骨の短剣':     '🗡️',
  '牙の槍':       '⚔️', '鉄の斧':       '🪓', '純鉄の剣':     '⚔️',
  '毒塗りパチンコ':'🏹', '翼の弓':       '🏹',
};

// 捨てられないアイテム
const unconsumableItems = new Set([
  'カギのかけら', '接着剤のもと', '接着剤', 'どこかの鍵',
  '実験記録', 'フレアガン', '研究所の記録', 'トランシーバー',
]);
