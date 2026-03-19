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
  turns: 0,
  killCount: 0,
  isSeaBoss: false,
  strongAttackCounter: 0,  // 強攻撃カウンター（3ターンごとに発動）
  feedThisTurn: false,     // このターン投げた（強攻撃キャンセル）
};

// =====================
// メッセージ待機
// =====================
let messageWaiting = false;
let nextAction = null;

// =====================
// セットアップ
// =====================

let snakeFirstKill = false; // 毒ヘビ初回討伐フラグ

let debugMode = false; // デバッグモード（ゲームオーバーなし）

let snakeWrapped = false; // 毒ヘビ巻き付き状態

// 資料入手フラグはstory.jsのconst documentObtained = {}で管理

let cave6DoorFound = false;    // 洞窟6層の扉発見フラグ
let cave6TransceiverLost = false; // トランシーバー紛失フラグ
// battle.stunnedはbattleオブジェクト内で管理
