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
