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
