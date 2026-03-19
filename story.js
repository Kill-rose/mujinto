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
  // ストーリーヒント
  { cond: () => !labGlueMaterialTaken || !itemCounts['接着剤のもと'] && !itemCounts['接着剤'] && !itemCounts['カギのかけら'] && !labHasKey,
    lines: ['ケイ：研究所の奥、まだ探索できていない場所があるかもしれません。\n実験室あたりを調べてみるといいかも。'] },
  { cond: () => itemCounts['カギのかけら'] > 0 && !itemCounts['蛇の皮'] && !itemCounts['接着剤'],
    lines: ['ケイ：森の奥に毒ヘビがいたような気が……。\n皮が何かの材料になるかもしれないですよ。'] },
  { cond: () => itemCounts['蛇の皮'] > 0 && itemCounts['接着剤のもと'] > 0 && !itemCounts['接着剤'],
    lines: ['ケイ：材料がそろってきましたね。\n広場で制作できますよ。'] },
  { cond: () => itemCounts['接着剤'] > 0 && itemCounts['カギのかけら'] > 0 && !labHasKey && !itemCounts['どこかの鍵'],
    lines: ['ケイ：接着剤とカギのかけら……もしかして鍵が作れるんじゃないですか？'] },
  { cond: () => (labHasKey || itemCounts['どこかの鍵'] > 0) && currentRoom === null,
    lines: ['ケイ：鍵ができましたね！\n研究所で使えるかも。行ってみましょう。'] },
  { cond: () => labHasKey && elapsedTime >= 100 && !labNaotoMet,
    lines: ['ケイ：研究所の廊下……なんか気配がしませんか。\n慎重に進んだ方がいいかも。'] },

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

// =====================
// 資料アイテムの内容（説明から読める）
// =====================
const documentContents = {
  '新聞の切れ端': `<b>【新聞の切れ端】</b><br>
「——社の株価が急落。海洋研究部門の——により——」<br>
「——名の乗客を乗せたクルーズ船『さくら丸』が消息を——」<br>
日付：2024年10月`,

  '濡れた手帳のページ': `<b>【濡れた手帳のページ】</b><br>
「TIDALWAVE INSTITUTEの林という研究員に声をかけられた。<br>
この航路は景色がいいと言っていた。<br>
妙に親切だったが、今思えば——」<br>
<i>ここで破れている</i>`,

  '錆びた看板の写真': `<b>【錆びた看板（森3層）】</b><br>
立入禁止<br>
TIDALWAVE INSTITUTE<br>
関係者以外の立入を固く禁ずる`,

  '手書きメモ': `<b>【手書きメモ（森7層）】</b><br>
「動物がおかしい。3ヶ月前から森の鳥が減った。<br>
魚も浜に近づかなくなった。<br>
先生はまだ信じてくれないだろうか。<br>
——ナオト　2013年9月」`,

  '実験ログ': `<b>【実験ログ（洞窟2層）】</b><br>
プロジェクト：TIDAL　経過報告 第17回<br>
被験者：篠原マスミ（No.3）松下トオル（No.4）<br>
　　　　立川サユ（No.5）二條カズトモ（No.6）<br><br>
No.3：海中適応率71%。感情の平坦化が見られる。<br>
No.4：海中適応率88%。水への依存が強まっている。<br>
No.6：海中適応率79%。攻撃性の上昇。隔離を推奨。<br>
備考：No.7より被験者との個人的な接触を禁ずる旨の通達あり。`,

  '金属扉のプレート': `<b>【金属扉のプレート（洞窟4層）】</b><br>
TIDALWAVE INSTITUTE<br>
第二研究棟 関係者専用<br>
——製薬株式会社　設立2004年`,

  '封鎖命令書': `<b>【封鎖命令書（洞窟探索）】</b><br>
極秘　2014年3月<br>
プロジェクトTIDAL　施設閉鎖に関する通達<br><br>
No.6の脱走および研究員2名への——により、<br>
本施設の継続運営は不可能と判断する。<br>
被験者の処——については別紙参照。<br>
島への航路情報を国際航路図より削除。`,

  'ナオトの日記（前半）': `<b>【林ナオトの日記（前半）】</b><br>
「2004年3月1日<br>
今日、研究所が完成した。<br>
ユキが死んでから8年。<br>
あの日海が荒れていなければ、あの船が少し丈夫だったなら。<br>
人は海で死ぬべきじゃない。<br>
それだけを考えてここまで来た。<br>
これは正しいことだと、まだ思っている。」`,

  'ナオトの日記（後半）': `<b>【林ナオトの日記（後半）】</b><br>
「2014年4月<br>
施設は閉鎖されたが、私は残ることにした。<br>
彼らを置いていけなかった。<br>
トオルはもう海に帰った。戻ってこない。<br>
マスミさんはまだここにいる。サユも。カズトモは……怒っている。<br>
ユキ、私は間違えた。」`,

  'ナオトのメモ': `<b>【ナオトのメモ（研究室）】</b><br>
「もし誰かがここまで来たなら。<br>
残りの記録はパスワードで守ってある。<br>
答えは、私が研究を始めた日だ。<br>
ユキが死んだ年の、3月1日。<br>
そこに私の番号を足せ。」`,
};

// 資料入手フラグ（各資料は1回のみ入手可能）
const documentObtained = {};

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
備考：No.7より被験者との個人的な接触を禁ずる旨の通達あり。`,

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
  // 廊下でどこかの鍵を持っていれば研究室を開錠
  if (room === '廊下' && !labHasKey && (itemCounts['どこかの鍵'] > 0)) {
    // 廊下移動時に鍵を自動で使うのではなく、useItemで使う設計のため何もしない
  }
  if (room === '研究室' && !labHasKey && !(itemCounts['どこかの鍵'] > 0)) {
    // 強制挿入イベント：鍵穴を発見
    currentRoom = '廊下'; // 廊下に留まる
    passTime(1);
    if (keiState === 'plaza' && keiPlazaArrived) {
      showPortrait('kei');
      showMessage(
        '研究室の扉の前に立つと、頑丈な鍵穴があった。<br>' +
        'このままでは開かない。',
        true,
        () => showMessage(
          'ケイ：ちょっと待って。<br>カギのかけら、持ってませんか？<br>それを修復すれば開けられるかも。',
          true,
          () => { hidePortrait(); updateElapsedTime(); updateParams(); showMainActions(); }
        )
      );
    } else {
      showMessage(
        '研究室の扉の前に立つと、頑丈な鍵穴があった。<br>' +
        '何か鍵になるものが必要だ。',
        false
      );
      updateElapsedTime(); updateParams(); showMainActions();
    }
    return;
  }
  // どこかの鍵を持っていれば消費して開錠
  if (room === '研究室' && !labHasKey && itemCounts['どこかの鍵'] > 0) {
    labHasKey = true;
    itemCounts['どこかの鍵']--;
    if (itemCounts['どこかの鍵'] <= 0) delete itemCounts['どこかの鍵'];
    showMessage('鍵が合った。扉が開いた。');
  }
  currentRoom = room;
  exploreCooldown[room] = exploreCooldown[room] || 0;
  exploreCounts[room]   = exploreCounts[room]   || 0;
  exploreCooldown[room] = 0;
  exploreCounts[room]   = 0;
  passTime(1);

  // 廊下：林ナオトイベント
  if (room === '廊下') {
    updateBgImage(room); // 部屋ごとの背景
    if (!labNaotoMet && elapsedTime < 170) {
      labNaotoMet = true;
      // 真相→自害→カギのかけらドロップの流れ
      showPortrait('naoto', 'normal');
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
    } else if (!labNaotoMet && elapsedTime >= 170) {
      labNaotoMet = true;
      showPortrait('naoto', 'mutant');
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

  updateBgImage(currentRoom || '廊下'); // 部屋ごとの背景
  updateElapsedTime();
  updateParams();
  showMainActions();
}

// 林ナオト戦（廊下で150時間後）
function startBattleNaoto() {
  battle.active     = true;
  battle.enemyName  = '？？？';
  battle.isNaoto    = true;
  battle.strongAttackCounter = 0;
  battle.feedThisTurn = false;
  battle.enemyHp    = 45;
  battle.enemyMaxHp = 45;
  battle.enemyAtk   = 12;
  battle.enemyRange = 2;
  battle.distance   = 3;
  battle.playerTurn = true;
  battle.place      = '廊下';
  state = 'battle';
  updateBattleInfo();
  updateParams();
  // ケイがいたら1ターン目にヒントを教えてくれる（ターン消費なし）
  if (keiPlazaArrived) {
    showPortrait('kei');
    showMessage(
      'ケイ：待って、よく見てください。<br>' +
      'あれ……3ターンごとに大きく構えをとる。その前にものを投げれば止められるかもしれない。<br>' +
      'あと、距離3以上離れれば通常攻撃は届きません。でも全力攻撃は遠くても来ます。',
      true,
      () => { hidePortrait(); showBattleActions(); }
    );
  } else {
    showMessage('？？？が現れた！　距離：3', false);
    showBattleActions();
  }
}

// =====================
// 研究所：メインアクション（上書き）
// =====================
function showLabActions() {
  if (messageWaiting) return;
  actionPanel.elt.style.visibility = 'visible';
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

  // 研究室PC
  if (currentRoom === '研究室') {
    if (!hasLabRecord) {
      createButton('PCを操作').parent(actionPanel).mousePressed(() => showPasswordInput());
    } else {
      // 記録入手後はパスワード入力不要、救助信号を送れる
      createButton('PCを操作').parent(actionPanel).mousePressed(() => showLabPCMenu());
    }
  }

  // ケイ会話（合流済みの場合）
  if (keiState === 'plaza' && keiPlazaArrived) {
    // 廊下で鍵を持っている場合の特別セリフ
    if (currentRoom === '廊下' && (itemCounts['どこかの鍵'] > 0 || labHasKey)) {
      let btnK = createButton('💬 会話').parent(actionPanel);
      btnK.style('border-color', 'var(--accent-dim)');
      btnK.style('color', 'var(--accent)');
      btnK.mousePressed(() => {
        showMessage(
          'ケイ：その鍵……この廊下のどこかの扉に合うんじゃないですか？<br>ここで使ってみたらどうでしょう。',
          true, () => showLabActions()
        );
      });
    } else if (keiLabDialogs[currentRoom]) {
      let btn = createButton('💬 会話').parent(actionPanel);
      btn.style('border-color', 'var(--accent-dim)');
      btn.style('color', 'var(--accent)');
      btn.mousePressed(() => {
        // 全部読んでもランダムでしゃべる
        let dialogs = keiLabDialogs[currentRoom];
        let idx = keiLabTalkCounts[currentRoom] < dialogs.length
          ? keiLabTalkCounts[currentRoom]++
          : Math.floor(Math.random() * dialogs.length);
        showMessage(dialogs[idx], true, () => showLabActions());
      });
    }
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
  // 1回のみの資料アイテム
  const roomDocs = {
    '廊下':   'ナオトの日記（前半）',
    '実験室': 'ナオトの日記（後半）',
    '倉庫':   '封鎖命令書',
  };
  if (roomDocs[room] && !documentObtained[roomDocs[room]]) {
    if (Math.random() < 0.3) {
      documentObtained[roomDocs[room]] = true;
      return roomDocs[room];
    }
  }
  if (room === '研究室' && !documentObtained['ナオトのメモ']) {
    documentObtained['ナオトのメモ'] = true;
    return 'ナオトのメモ';
  }
  const pools = {
    '廊下':   ['救急キット', '骨', '石', null],
    '研究室': ['薬草', '貴重な薬草', null, null],
    '実験室': ['毒の牙', '薬草', '骨', null],
    '倉庫':   ['石', '鉄鉱石', '非常食', null],
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
        hasLabRecord = true;
        // 研究所の記録入手後：このPCから救助を呼べることを示す
        showMessage(
          '<b>【端末：追加機能発見】</b><br><br>' +
          '記録の最後に、別のプログラムが起動した。<br>' +
          '「緊急通報システム——衛星回線経由で救助信号を送信できます」<br><br>' +
          '<span style="color:var(--accent)">（このPCから救助を呼べる。「PCを操作」から「救助信号を送る」を選ぼう）</span>',
          true,
          () => showLabActions()
        );
      }
    );
  } else {
    showMessage('パスワードが違う。', true, () => showPasswordInput());
  }
}


// =====================
// 立ち絵表示
// =====================

// =====================
// 研究室PC：記録入手後のメニュー
// =====================
function showLabPCMenu() {
  actionPanel.html('');
  showMessage('端末が起動している。何をする？');
  createButton('記録を確認').parent(actionPanel).mousePressed(() => {
    showMessage(
      '<b>【研究所の記録（概要）】</b><br><br>' +
      'プロジェクト：TIDAL　発注：——省<br>' +
      '目的：極限環境下での生存能力を持つ人間の量産<br>' +
      '被験者No.3〜7　林ナオト（No.7、自己投与）<br><br>' +
      'ユキ、ごめん。',
      true, () => showLabActions()
    );
  });
  createButton('救助信号を送る').parent(actionPanel).mousePressed(() => {
    showMessage(
      'ためらいながらも、送信ボタンを押した。<br>' +
      '画面に「送信完了——衛星回線を確認しました」と表示された。<br><br>' +
      '……数時間後、外から音が聞こえてきた。',
      true,
      () => showMessage(
        'ヘリコプターだ。<br>' +
        (keiPlazaArrived
          ? 'ケイが隣に立っていた。「来た……来てくれた」と彼は言った。'
          : '一人で、その音を聞いていた。'),
        true,
        () => showTruthEnding()
      )
    );
  });
  createButton('戻る').parent(actionPanel).mousePressed(() => showLabActions());
}

// =====================
// 謎解きエンディング（豪華演出）
// =====================
function showTruthEnding() {
  clearUI();
  container.html('');
  let endDiv = createDiv().parent(container);
  endDiv.elt.style.cssText = `
    width:100%; height:100%;
    display:flex; flex-direction:column;
    justify-content:center; align-items:center;
    text-align:center; padding:40px;
    background: radial-gradient(ellipse at 30% 60%, #0a2218 0%, #050e06 50%, #000 100%);
    overflow:hidden; position:relative;
  `;

  // パーティクル風の装飾
  let canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0.3;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  endDiv.elt.appendChild(canvas);
  let ctx = canvas.getContext('2d');
  let particles = Array.from({length: 60}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.5,
    vy: -(Math.random() * 0.4 + 0.1),
    o: Math.random()
  }));
  function animParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(143,188,90,${p.o})`;
      ctx.fill();
      p.y += p.vy;
      p.o = 0.3 + 0.3 * Math.sin(Date.now() / 800 + p.x);
      if (p.y < 0) p.y = canvas.height;
    });
    requestAnimationFrame(animParticles);
  }
  animParticles();

  let withKei = keiPlazaArrived;
  let content = endDiv.elt;

  // タイトル
  let titleEl = document.createElement('div');
  titleEl.style.cssText = `font-family:Cinzel,serif;font-size:clamp(26px,5.5vw,62px);color:#8fbc5a;letter-spacing:0.2em;margin-bottom:28px;opacity:0;transition:opacity 1.5s;`;
  titleEl.textContent = 'ENDING: TRUTH';
  content.appendChild(titleEl);

  // サブタイトル
  let subEl = document.createElement('div');
  subEl.style.cssText = `font-family:Cinzel,serif;font-size:clamp(13px,2vw,20px);color:#c9a84c;letter-spacing:0.15em;margin-bottom:32px;opacity:0;transition:opacity 1.5s;`;
  subEl.textContent = withKei ? '— The Truth Comes to Light —' : '— Alone with the Truth —';
  content.appendChild(subEl);

  // 本文
  let storyEl = document.createElement('div');
  storyEl.style.cssText = `color:#d4d8cc;font-size:clamp(13px,1.8vw,21px);max-width:640px;line-height:2.0;margin-bottom:20px;opacity:0;transition:opacity 1.5s;`;
  storyEl.innerHTML = withKei
    ? `救助ヘリは、研究所の上空に降りた。<br>
       ケイと並んで乗り込んだ。<br><br>
       「あの記録、ちゃんと届けましょう」<br>
       彼はそう言って、窓の外を見た。<br><br>
       島は小さくなっていく。<br>
       林ナオトが残したもの、被験者たちの名前、すべてを——<br>
       世界に届ける。それが、生き残った者にできることだ。`
    : `救助ヘリに一人で乗り込んだ。<br><br>
       林ナオトが残した記録をポケットに入れたまま、窓の外を見ていた。<br>
       島が遠ざかる。<br><br>
       プロジェクト・タイダルを発注した者は、まだいる。<br>
       この記録が、彼らに届くことを——<br>
       そう願いながら、空を見上げた。`;
  content.appendChild(storyEl);

  // 経過時間
  let timeEl = document.createElement('div');
  timeEl.style.cssText = 'color:#4a5245;font-size:clamp(11px,1.4vw,15px);margin-bottom:28px;opacity:0;transition:opacity 1.5s;';
  timeEl.textContent = `経過時間：${elapsedTime} 時間`;
  content.appendChild(timeEl);

  // ボタン
  let btnEl = document.createElement('button');
  btnEl.textContent = 'タイトルに戻る';
  btnEl.style.cssText = 'margin-top:8px;font-size:clamp(13px,1.8vw,18px);padding:12px 44px;background:transparent;border:1px solid #3a6030;color:#8fbc5a;cursor:pointer;font-family:Noto Serif JP,serif;letter-spacing:0.1em;opacity:0;transition:opacity 1.5s;';
  btnEl.addEventListener('click', () => location.reload());
  content.appendChild(btnEl);

  // 順番にフェードイン
  setTimeout(() => { titleEl.style.opacity = '1'; }, 300);
  setTimeout(() => { subEl.style.opacity = '1'; }, 1200);
  setTimeout(() => { storyEl.style.opacity = '1'; }, 2200);
  setTimeout(() => { timeEl.style.opacity = '1'; }, 3200);
  setTimeout(() => { btnEl.style.opacity = '1'; }, 3800);
}
