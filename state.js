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
