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

  showPortrait('kei', 'down');
  showMessage(
    `「${itemName}」を差し出すと、ケイは両手で受け取り、すぐに口に入れた。<br>` +
    'しばらくして、顔に少し血色が戻ってきた。',
    true,
    () => {
      showPortrait('kei', 'happy');
      showMessage(
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
      );
    }
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

// ケイが倒れている間の専用アクションパネル
function showForest8Actions() {
  actionPanel.html('');
  // 立ち絵を常時表示
  if (!select('#portrait')) showPortrait('kei');

  // 探索はできるが敵は出ない
  createButton('探索').parent(actionPanel).mousePressed(() => {
    exploreForest8Safe();
  });

  // 会話ボタン
  createButton('会話').parent(actionPanel).mousePressed(() => {
    showMessage(
      'ケイ：……何か食べ物、ありませんか。<br>' +
      '10日間、ほとんど何も食べていなくて。<br>' +
      'この傷が治れば、一緒に動けるんですが。',
      true,
      () => { showForest8Actions(); }
    );
  });

  // 移動（森8層に固定なので移動不可）
  let btnMove = createButton('移動').parent(actionPanel);
  btnMove.attribute('disabled', 'true');

  showMessage('新川ケイが倒れている。何か渡せるものがあれば助けられるかもしれない。');
  updateParams();
}

// 森8層での安全な探索（敵が出ない）
function exploreForest8Safe() {
  if ((exploreCooldown['森'] || 0) > 0) {
    showMessage('ここからはこれ以上何も見つからなさそうだ。<br>時間を置いてみよう。');
    return;
  }
  exploreCounts['森'] = (exploreCounts['森'] || 0) + 1;
  passTime(1);
  player.mp = constrain(player.mp - 1, 0, MAX_MP);
  if (exploreCounts['森'] >= EXPLORE_LIMIT) {
    exploreCooldown['森'] = 5;
    exploreCounts['森'] = 0;
  }
  // 敵は出ない、アイテムのみ
  let item = getRandomItem('森', 7);
  addItem(item);
  showMessage(`森を探索して「${item}」を入手した。`);
  updateParams();
  showForest8Actions();
}

function showMainActions() {
  if (messageWaiting) return;
  actionPanel.elt.style.visibility = 'visible';
  if (currentRoom !== null) { showLabActions(); return; }

  // 森8層到達時の強制挿入イベント（探索押下不要）
  let layer8 = placeLayers['森'] || 0;
  if (currentPlace === '森' && layer8 >= 7 && !forest8EventDone) {
    forest8EventDone = true;
    keiState = 'met';
    actionPanel.html('');
    showPortrait('kei');
    showMessage(
      '深い森の奥を進むと、木の根元に人が倒れているのが見えた。<br>' +
      '駆け寄ると、若い男だった。足に深い傷を負っている。<br>' +
      'ゆっくりと目を開け、こちらを見た。',
      true,
      () => showMessage(
        'ケイ：人間……？本当に人間ですか。<br>' +
        'よかった。もう10日も……動けなくて。',
        true,
        () => showMessage(
          'ケイ：あなたも、あの船から？<br>' +
          '僕は新川ケイ。港で林って人に声をかけられて、この航路を勧められたんです。',
          true,
          () => {
            showMessage(
              '彼は足の傷がひどく、今すぐ動くことはできないようだった。<br>' +
              '何か回復するものを渡せれば、合流できるかもしれない。<br>' +
              '<span style="color:var(--accent)">（アイテム一覧から回復系アイテムを選んで「渡す」ボタンを押そう）</span>',
              false, null
            );
            updateParams();
            showForest8Actions(); // ケイ倒れ中専用アクション
          }
        )
      )
    );
    return;
  }

  // ケイが倒れている間は専用アクション
  if (currentPlace === '森' && keiState === 'met' && !keiHealDone) {
    showForest8Actions();
    return;
  }

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

  let btnEx = createButton('🔍 探索').parent(actionPanel);
  btnEx.elt.style.borderColor = 'var(--accent-dim)';
  btnEx.mousePressed(() => explore(currentPlace));
  // 森・洞窟では「前進」：確実に敵と遭遇する
  if (currentPlace === '森' || currentPlace === '洞窟') {
    createButton('前進').parent(actionPanel).mousePressed(() => {
      passTime(1);
      player.mp = constrain(player.mp - 1, 0, MAX_MP);
      updateParams();
      showMessage(`${currentPlace}を奥へと進んだ……敵と遭遇した！`);
      startBattle(currentPlace);
    });
  }
  createButton('🗺 移動').parent(actionPanel).mousePressed(() => showMoveOptions());
  // 広場で焚火あり：待機非表示、焚火ボタンを表示
  // デバッグ用：アイテム全入手
  if (false && currentPlace === '広場') {
    let btnAll = createButton('🔧 全アイテム').parent(actionPanel);
    btnAll.elt.style.borderColor = '#c0503a';
    btnAll.elt.style.color = '#e8a090';
    btnAll.mousePressed(() => {
      const allItems = [
        '木の枝','草','石','木材','小果実','りんご',
        'うさぎ肉','狼の肉','骨','牙','翼の膜','毒の牙','蛇の皮',
        '鉄鉱石','純鉄','大きな木材','特別な木材','薬草','貴重な薬草','宝石',
        '接着剤のもと','接着剤','カギのかけら',
      ];
      allItems.forEach(n => addItem(n, 5));
      labGlueMaterialTaken = true;
      showMessage('[DEBUG] アイテム全入手');
      updateParams();
    });
  }

  if (currentPlace === '広場' && hasCampfire) {
    let btnCampRest = createButton('🔥 待機').parent(actionPanel);
    btnCampRest.elt.style.borderColor = 'var(--gold-dim)';
    btnCampRest.mousePressed(() => {
      player.mp = constrain(player.mp + 10, 0, MAX_MP);
      player.hp = constrain(player.hp + 5,  0, MAX_HP);
      showMessage('焚火の周りで休憩した。気力と体力が回復した。');
      passTime(1);
      showMainActions();
    });
    createButton('🪵 燃料投入').parent(actionPanel).mousePressed(() => addFuelFromPanel());
  } else {
    createButton('⏳ 待機').parent(actionPanel).mousePressed(() => waitAction());
  }
  if (hasRaft) {
    let btnRaft = createButton('🛶 いかだ').parent(actionPanel);
    btnRaft.elt.style.borderColor = 'var(--gold-dim)';
    btnRaft.elt.style.color = 'var(--gold)';
    btnRaft.mousePressed(onRaftClick);
  }

  if (currentPlace === '広場' && keiState === 'plaza' && keiPlazaArrived) {
    let keiBtn = createButton('ケイと話す').parent(actionPanel);
    keiBtn.style('border-color', 'var(--accent-dim)');
    keiBtn.style('color', 'var(--accent)');
    keiBtn.mousePressed(() => talkToKeiPlaza());
  }

  // 広場でのみ制作可能
  // 洞窟6層：扉発見後「武器を使用」ボタン
  if (currentPlace === '洞窟' && (placeLayers['洞窟'] || 0) >= 5 && cave6DoorFound && !labUnlocked) {
    let hasWeapon = Object.keys(weapons).some(w => (itemCounts[w] || 0) > 0);
    let btnBreak = createButton('⚔ 武器で崩す').parent(actionPanel);
    if (!hasWeapon) btnBreak.attribute('disabled', 'true');
    btnBreak.elt.style.borderColor = 'var(--danger)';
    btnBreak.elt.style.color = '#e8a090';
    btnBreak.mousePressed(() => {
      // トランシーバーが埋まる（あれば消失）
      if (itemCounts['トランシーバー']) {
        delete itemCounts['トランシーバー'];
        cave6TransceiverLost = true;
      }
      labUnlocked = true;
      showMessage(
        '武器で壁を砕くと、轟音とともに瓦礫が崩れ落ちた。<br>' +
        '……その先に、錆びた金属製の扉が現れた。<br>' +
        '<span style="color:var(--accent)">（研究所への入口が開いた）</span>',
        true, () => { updateElapsedTime(); updateParams(); showMainActions(); }
      );
      updateParams();
    });
  }

  // 洞窟6層：金属板ボタン
  if (currentPlace === '洞窟' && (placeLayers['洞窟'] || 0) >= 5) {
    let btnPlate = createButton('🪧 金属板').parent(actionPanel);
    btnPlate.elt.style.borderColor = '#555';
    btnPlate.mousePressed(() => {
      let prev = textZone.elt.innerHTML;
      showMessage(
        '<b>【金属扉のプレート】</b><br>' +
        'TIDALWAVE INSTITUTE<br>' +
        '第二研究棟 関係者専用<br>' +
        '——製薬株式会社　設立2004年',
        true, () => showMessage(prev)
      );
    });
  }

  // 森・洞窟での後退（層-1）ボタン
  if ((currentPlace === '森' || currentPlace === '洞窟') && (placeLayers[currentPlace] || 0) > 0) {
    let btnRetreat = createButton('⬇ 後退').parent(actionPanel);
    btnRetreat.elt.style.borderColor = '#555';
    btnRetreat.mousePressed(() => {
      placeLayers[currentPlace] = max(0, (placeLayers[currentPlace] || 0) - 1);
      exploreCooldown[currentPlace] = 0;
      exploreCounts[currentPlace] = 0;
      let newL = placeLayers[currentPlace];
      showMessage(`${currentPlace}の${newL + 1}層に戻った。`);
      updateElapsedTime();
      showMainActions();
    });
  }

  let btnCraftMain = createButton('🔨 制作').parent(actionPanel);
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
  // ケイがいたら2人では乗れない
  if (keiPlazaArrived) {
    showMessage(
      'ケイ：待ってください。このいかだ、2人では乗れないですよ。<br>' +
      'それに、生存率が低すぎる。海上で何かいるとしたら……<br>' +
      'もっと確実な方法を探しましょう。研究所に行けば何かあるかもしれない。'
    );
    return;
  }
  if (player.hp < 80 || player.mp < 30) {
    showMessage('体力か気力が足りない。このまま出発するのは危険だ。（HP80・MP30以上必要）');
    return;
  }
  // 出発演出→海上ボス戦
  showMessage(
    'いかだに乗り込み、沖へと漕ぎ出した。<br>' +
    '風は穏やかだった。しかし——<br>' +
    '海面が揺れ、巨大な影がいかだの下を通り過ぎた。',
    true,
    () => startSeaBoss()
  );
}

// =====================
// 海上ボス戦
// =====================
function startSeaBoss() {
  battle.active     = true;
  battle.enemyName  = '？？？';
  battle.enemyHp    = 60;
  battle.enemyMaxHp = 60;
  battle.enemyAtk   = 15;
  battle.enemyRange = 2;
  battle.distance   = 4;
  battle.playerTurn = true;
  battle.place      = '海上';
  battle.turns      = 0;
  battle.isSeaBoss  = true;
  battle.strongAttackCounter = 0;
  battle.feedThisTurn = false;
  state = 'battle';
  updateBattleInfo();
  updateParams();
  // 謎解きルートクリア済みなら特別メッセージ
  if (hasLabRecord) {
    showMessage(
      '海面から巨大な影が浮かび上がってきた。<br>' +
      'その目には、かすかに理性の光が残っているように見えた。<br><br>' +
      '研究所の記録を持っている。この戦いに意味がある。',
      true,
      () => showBattleActions()
    );
  } else {
    showMessage(
      '巨大な怪物がいかだに迫ってくる！<br>戦うしかない。',
      false, null
    );
    showBattleActions();
  }
}

// 海上ボス撃破後のエンディング分岐
function endSeaBoss() {
  battle.active    = false;
  battle.isSeaBoss = false;
  state = 'game';
  clearUI();
  container.html('');

  let endDiv = createDiv().parent(container);
  endDiv.elt.style.cssText = `
    width:100%; height:100%;
    display:flex; flex-direction:column;
    justify-content:center; align-items:center;
    text-align:center; padding:40px;
  `;

  // エンディング分岐
  if (hasLabRecord && keiPlazaArrived) {
    // 最良エンド：謎解き＋同行
    endDiv.elt.style.background = 'radial-gradient(ellipse at center, #0a2a18 0%, #050e08 70%)';
    endDiv.html(`
      <div style="font-family:Cinzel,serif;font-size:clamp(24px,5vw,52px);color:#8fbc5a;letter-spacing:0.15em;margin-bottom:20px">ENDING: TRUTH</div>
      <div style="color:#c9a84c;font-size:clamp(14px,2vw,22px);max-width:600px;line-height:1.8;margin-bottom:16px">
        怪物を倒し、いかだは沖へ出た。<br>
        ケイが隣に立っていた。<br>
        「全部終わったんですね」と彼は言った。<br><br>
        研究所の記録は、すべての真実を証明している。<br>
        プロジェクト・タイダルは終わった。しかし——発注した側はまだいる。
      </div>
      <div style="color:#7a8572;font-size:clamp(12px,1.5vw,17px)">経過時間：${elapsedTime} 時間</div>
    `);
  } else if (hasLabRecord) {
    // 謎解きエンド
    endDiv.elt.style.background = 'radial-gradient(ellipse at center, #0a1e2a 0%, #050810 70%)';
    endDiv.html(`
      <div style="font-family:Cinzel,serif;font-size:clamp(24px,5vw,52px);color:#80b8d8;letter-spacing:0.15em;margin-bottom:20px">ENDING: RECORD</div>
      <div style="color:#d4d8cc;font-size:clamp(14px,2vw,22px);max-width:600px;line-height:1.8;margin-bottom:16px">
        怪物を退け、沖に出た。<br>
        ポケットには研究所の記録がある。<br>
        林ナオトが残した証拠。<br><br>
        これを世に出すことが、彼への、そして被験者たちへの——<br>
        せめてもの弔いになるだろうか。
      </div>
      <div style="color:#7a8572;font-size:clamp(12px,1.5vw,17px)">経過時間：${elapsedTime} 時間</div>
    `);
  } else if (keiPlazaArrived) {
    // 同行エンド
    endDiv.elt.style.background = 'radial-gradient(ellipse at center, #182810 0%, #080e05 70%)';
    endDiv.html(`
      <div style="font-family:Cinzel,serif;font-size:clamp(24px,5vw,52px);color:#8fbc5a;letter-spacing:0.15em;margin-bottom:20px">ENDING: TOGETHER</div>
      <div style="color:#d4d8cc;font-size:clamp(14px,2vw,22px);max-width:600px;line-height:1.8;margin-bottom:16px">
        怪物を倒し、いかだは沖に出た。<br>
        ケイが隣で漕いでいた。<br>
        「あの島のこと、いつか話せる日が来るといいですね」<br><br>
        島は遠ざかり、やがて見えなくなった。
      </div>
      <div style="color:#7a8572;font-size:clamp(12px,1.5vw,17px)">経過時間：${elapsedTime} 時間</div>
    `);
  } else {
    // 通常エンド
    endDiv.elt.style.background = 'radial-gradient(ellipse at center, #1a2418 0%, #080e05 70%)';
    endDiv.html(`
      <div style="font-family:Cinzel,serif;font-size:clamp(24px,5vw,52px);color:#c9a84c;letter-spacing:0.15em;margin-bottom:20px">ENDING: ESCAPE</div>
      <div style="color:#d4d8cc;font-size:clamp(14px,2vw,22px);max-width:600px;line-height:1.8;margin-bottom:16px">
        怪物を退け、いかだは沖へ向かった。<br>
        島に何があったのか、まだ何も知らない。<br><br>
        ただ、生きて帰ることができた。
      </div>
      <div style="color:#7a8572;font-size:clamp(12px,1.5vw,17px)">経過時間：${elapsedTime} 時間</div>
    `);
  }

  createButton('タイトルに戻る').parent(endDiv)
    .elt.style.cssText = 'margin-top:32px;font-size:clamp(13px,2vw,20px);padding:12px 40px;background:transparent;border:1px solid #3a4235;color:#8fbc5a;cursor:pointer;';
  endDiv.elt.querySelector('button').addEventListener('click', () => location.reload());
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
    // ケイ未回復中は森8層を固定（層変更なし）
    if (!(currentPlace === '森' && keiState === 'met' && !keiHealDone)) {
      placeLayers[currentPlace] = max(0, (maxLayers[currentPlace] || 0) - 1);
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

  // 森8層イベントはshowMainActionsで強制挿入

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

  // 洞窟6層目の特殊イベント
  if (place === '洞窟' && layer >= 5) {
    // トランシーバー入手（100時間未満・未入手）
    if (elapsedTime < 150 && !itemCounts['トランシーバー'] && !cave6TransceiverLost) {
      let cave6Count = (exploreCounts[place] || 0);
      if (cave6Count <= 1) {
        // 初回探索：金属箱を発見
        addItem('トランシーバー');
        showMessage(
          '瓦礫の隙間に錆びた金属箱を発見した。<br>中に古い<b>トランシーバー</b>が入っていた！<br>' +
          '<span style="color:var(--accent)">（使用すると助けを呼べる）</span>',
          true, () => { updateElapsedTime(); updateParams(); showMainActions(); }
        );
        updateParams();
        return;
      }
    }
    // 5回探索で扉発見メッセージ
    if ((exploreCounts[place] || 0) >= 4 && !labUnlocked && !cave6DoorFound) {
      cave6DoorFound = true;
      showMessage(
        '瓦礫の奥に、金属製の扉らしきものが見える。<br>' +
        '壁を掘れば入れるかもしれない……何か使えるものがあれば。',
        true, () => { updateElapsedTime(); updateParams(); showMainActions(); }
      );
      return;
    }
    // 研究所解放（100時間以降）
    if (elapsedTime >= 100 && !labUnlocked) {
      labUnlocked = true;
      showMessage(
        '深部を進むと、崩落した壁の向こうに金属製の扉が見えた。<br>' +
        '……研究所への入口だ。<br>' +
        '<span style="color:#adf">（移動先に「研究所：廊下」が追加された）</span>',
        true, () => { updateElapsedTime(); updateParams(); showMainActions(); }
      );
      return;
    }
  }

  let rand = random();

  if (place === '広場') {
    // 広場：85%アイテム、15%何もなし
    if (rand < 0.85) {
      let count = Math.random() < 0.25 ? 2 : 1;
      let items = [];
      for (let i = 0; i < count; i++) { let it = getRandomItem(place, layer); addItem(it); items.push(it); }
      showMessage(`${place}を探索して「${items.join('・')}」を入手した。`);
    } else {
      showMessage(`${place}を探索したが、何も見つからなかった。`);
    }
    updateParams();
  } else {
    // 森・洞窟：1層目は20%、2層目以降は10%の戦闘確率
    let battleChance = (layer === 0) ? 0.20 : 0.10;
    if (rand < battleChance) {
      startBattle(place);
    } else if (rand < 0.90) {
      // 層が高いほど多く、基本でも20%で2個
      let itemCount = 1 + floor(layer / 3) + (Math.random() < 0.20 ? 1 : 0);
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
    pool = ['木の枝', '木の枝', '小果実', '草', '草', '草', '石'];
    // 広場：漂流物資料（1回のみ）
    if (!documentObtained['新聞の切れ端'] && Math.random() < 0.15) {
      documentObtained['新聞の切れ端'] = true; return '新聞の切れ端';
    }
    if (!documentObtained['濡れた手帳のページ'] && Math.random() < 0.12) {
      documentObtained['濡れた手帳のページ'] = true; return '濡れた手帳のページ';
    }
  } else if (place === '森') {
    // 森の資料（1回のみ・層条件）
    if (layer >= 4 && !documentObtained['錆びた看板の写真'] && Math.random() < 0.25) {
      documentObtained['錆びた看板の写真'] = true; return '錆びた看板の写真';
    }
    if (layer >= 6 && !documentObtained['手書きメモ'] && Math.random() < 0.25) {
      documentObtained['手書きメモ'] = true; return '手書きメモ';
    }
    pool = ['木材', '木の枝', '草', '草', 'りんご'];
    if (layer >= 3) pool.push('大きな木材', '薬草', '薬草');
    if (layer >= 6) pool.push('特別な木材', '貴重な薬草');
  } else {
    // 洞窟の資料（1回のみ・層条件）
    if (layer >= 1 && !documentObtained['実験ログ'] && Math.random() < 0.25) {
      documentObtained['実験ログ'] = true; return '実験ログ';
    }
    if (layer >= 3 && !documentObtained['金属扉のプレート'] && Math.random() < 0.25) {
      documentObtained['金属扉のプレート'] = true; return '金属扉のプレート';
    }
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
  // 焚火燃料は時間経過で減少しない（明示的な投入のみ）
  if (player.mp <= 0) {
    player.hp -= 5 * hours;
    showMessage(textZone.html() + '<br><span style="color:tomato">気力が0なので体力が減少した。</span>');
  } else if (player.mp >= 40) {
    // 広場で焚火あり：HP回復UPボーナス
    let hpRegen = (currentPlace === '広場' && hasCampfire) ? 5 : 2;
    player.hp += hpRegen * hours;
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
function startBattleLab(room) {
  // 研究所専用エネミーをランダム選択
  let labEnemies = ['ウミウシ（変異体）', 'アンコウ（変異体）', 'タコ（変異体）'];
  let name = labEnemies[Math.floor(Math.random() * labEnemies.length)];
  let e = enemyTypes[name];
  battle.active     = true;
  battle.enemyName  = name;
  battle.enemyHp    = Math.floor(Math.random() * (e.hp[1] - e.hp[0] + 1)) + e.hp[0];
  battle.enemyMaxHp = battle.enemyHp;
  battle.enemyAtk   = e.atk;
  battle.enemyRange = e.range;
  battle.distance   = 4;
  battle.playerTurn = true;
  battle.place      = room;
  battle.turns      = 0;
  battle.isNaoto    = false;
  state = 'battle';
  let rangeHint = e.range > 1 ? `<br><span style="color:#aaa">（射程${e.range}：距離${e.range+1}以上で安全）</span>` : '';
  updateBattleInfo();
  updateParams();
  showMessage(`${name}が現れた！<br>${e.desc}${rangeHint}`);
  showBattleActions();
}

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
  actionPanel.elt.style.visibility = 'visible';
  actionPanel.html('');

  // 前進（距離>1のとき有効）
  let btnFwd = createButton('⬆ 前進').parent(actionPanel);
  if (battle.distance <= 1) btnFwd.attribute('disabled', 'true');
  btnFwd.mousePressed(() => playerBattleAction('forward'));

  // 距離6のとき後退→逃走に変える
  if (battle.distance >= 6) {
    let btnEsc = createButton('🚪 逃走').parent(actionPanel); btnEsc.elt.style.borderColor='var(--danger)'; btnEsc.elt.style.color='#e8a090'; btnEsc
      .mousePressed(() => playerBattleAction('escape'));
  } else {
    createButton('⬇ 後退').parent(actionPanel)
      .mousePressed(() => playerBattleAction('backward'));
  }

  // 待機
  createButton('⏸ 待機').parent(actionPanel).mousePressed(() => playerBattleAction('wait'));

  // 素手（距離1のみ・気力あり）
  if (battle.distance <= 1) {
    createButton('👊 素手（射程1 / 攻撃力1）').parent(actionPanel)
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

  // 回復アイテムを使う（ターン消費）
  const healItems = ['りんご','小果実','うさぎ肉','狼の肉','干し肉','狼肉の燻製','薬草スープ','万能薬','救急キット'];
  let hasHeal = healItems.some(n => (itemCounts[n] || 0) > 0);
  if (hasHeal) {
    createButton('アイテム').parent(actionPanel).mousePressed(() => showBattleHealMenu());
  }

  // 観察ボタン
  createButton('観察').parent(actionPanel).mousePressed(() => {
    let hint = getBattleObserveHint();
    let prevMsg = textZone.elt.innerHTML;
    showMessage(hint, true, () => { showMessage(prevMsg); showBattleActions(); });
  });

  // ？？？にアイテムを食わせる（ボス戦のみ・非回復アイテム）
  if (battle.isSeaBoss || battle.isNaoto) {
    // 食わせられるアイテム（武器・素材など回復以外）
    let feedCandidates = Object.keys(itemCounts).filter(n =>
      (itemCounts[n] || 0) > 0 && !healItems.includes(n) && !(n in weapons)
    );
    if (feedCandidates.length > 0) {
      createButton('投げる').parent(actionPanel).mousePressed(() => showBattleFeedMenu());
    }
  }
}

// 戦闘中回復メニュー
function showBattleHealMenu() {
  const healItems = ['りんご','小果実','うさぎ肉','狼の肉','干し肉','狼肉の燻製','薬草スープ','万能薬','救急キット'];
  const foodTable = {
    'りんご': { hp:0, mp:10 }, '小果実': { hp:0, mp:10 },
    'うさぎ肉': { hp:0, mp:15 }, '狼の肉': { hp:0, mp:20 },
    '干し肉': { hp:15, mp:10 }, '狼肉の燻製': { hp:20, mp:20 },
    '薬草スープ': { hp:20, mp:0 }, '万能薬': { hp:100, mp:0 },
    '救急キット': { hp:25, mp:0 },
  };
  actionPanel.html('');
  showMessage('どのアイテムを使う？（1ターン消費）');
  healItems.filter(n => (itemCounts[n]||0) > 0).forEach(n => {
    let f = foodTable[n];
    let label = f.hp === 100 ? `${n}（HP全回復）` :
      [f.hp > 0 ? `HP+${f.hp}` : '', f.mp > 0 ? `気力+${f.mp}` : ''].filter(Boolean).join(' / ');
    createButton(`${n} （${label}）`).parent(actionPanel).mousePressed(() => {
      // アイテム消費・回復・ターン消費
      player.mp = constrain(player.mp - 1, 0, MAX_MP);
      battle.turns++;
      itemCounts[n]--;
      if (itemCounts[n] <= 0) delete itemCounts[n];
      if (f.hp === 100) player.hp = MAX_HP;
      else {
        player.hp = constrain(player.hp + f.hp, 0, MAX_HP);
        player.mp = constrain(player.mp + f.mp, 0, MAX_MP);
      }
      battle.playerTurn = false;
      updateBattleInfo();
      updateParams();
      let healMsg = f.hp === 100 ? `「${n}」を使った。体力が全回復した！` :
        `「${n}」を使った。${f.hp>0?'体力+'+f.hp:''}${f.mp>0?' 気力+'+f.mp:''}`;
      let _eri = calcEnemyAction();
      let enemyMsgItem = typeof _eri === 'string' ? _eri : (_eri.msg || '');
      let itemDead     = typeof _eri === 'object' ? !!_eri.isDead : false;
      battle.playerTurn = true;
      updateBattleInfo();
      updateParams();
      if (itemDead || player.hp <= 0) {
        showMessage(healMsg + '<br><span style="color:#f88">▶ ' + enemyMsgItem + '</span><br>体力が尽きた……', true, () => gameOver());
      } else {
        showMessage(healMsg + '<br><span style="color:#f88">▶ ' + enemyMsgItem + '</span>');
        showBattleActions();
      }
    });
  });
  createButton('戻る').parent(actionPanel).mousePressed(() => showBattleActions());
}

// ？？？にアイテムを食わせるメニュー
function showBattleFeedMenu() {
  const healItems = ['りんご','小果実','うさぎ肉','狼の肉','干し肉','狼肉の燻製','薬草スープ','万能薬','救急キット'];
  let feedCandidates = Object.keys(itemCounts).filter(n =>
    (itemCounts[n]||0) > 0 && !healItems.includes(n) && !(n in weapons)
  );
  actionPanel.html('');
  showMessage('何を食わせる？（1ターン消費・敵HP-3・そのターン攻撃なし）');
  feedCandidates.forEach(n => {
    createButton(`${n} ×${itemCounts[n]}`).parent(actionPanel).mousePressed(() => {
      player.mp = constrain(player.mp - 1, 0, MAX_MP);
      battle.turns++;
      itemCounts[n]--;
      if (itemCounts[n] <= 0) delete itemCounts[n];
      battle.enemyHp = Math.max(0, battle.enemyHp - 3);
      battle.feedThisTurn = true; // このターン強攻撃もキャンセル
      battle.playerTurn = true;
      updateBattleInfo();
      updateParams();
      if (battle.enemyHp <= 0) {
        showMessage(`「${n}」を食わせた。……？？？は動かなくなった。`, true, () => endBattle(true));
        return;
      }
      showMessage(`「${n}」を投げた。？？？はそれを食いついた。（HP-3）<br>敵の攻撃はなかった。`);
      showBattleActions();
    });
  });
  createButton('戻る').parent(actionPanel).mousePressed(() => showBattleActions());
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
  if (player.mp <= 0 && type === 'attack' && Math.random() < 0.30) {
    // 行動失敗：即座に敵行動を計算して一緒に表示
    let _erf = calcEnemyAction();
    let failEnemyMsg  = typeof _erf === 'string' ? _erf : (_erf.msg || '');
    let failEnemyDead = typeof _erf === 'object' ? !!_erf.isDead : false;
    battle.playerTurn = true;
    updateBattleInfo();
    updateParams();
    let failCombined = '気力が尽きて……行動に失敗した。' +
      '<br><span style="color:#f88">▶ ' + failEnemyMsg + '</span>';
    if (failEnemyDead || player.hp <= 0) {
      showMessage(failCombined + '<br><span style="color:tomato">体力が尽きた……</span>', true, () => gameOver());
    } else {
      showMessage(failCombined);
      showBattleActions();
    }
    return;
  }

  let msg = '';

  if (type === 'forward') {
    if (battle.isSeaBoss && Math.random() < 0.10) {
      msg = '風に押し戻された！前進できなかった。';
    } else {
      battle.distance--;
      msg = `前進した。距離：${battle.distance}`;
    }
  } else if (type === 'backward') {
    if (battle.isSeaBoss && Math.random() < 0.10) {
      msg = '波に流された！後退できなかった。';
    } else {
      battle.distance++;
      msg = `後退した。距離：${battle.distance}`;
    }
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
    let dmg = atk + floor(random(0, 2));
    battle.enemyHp -= dmg;
    let pAtkStr = weaponName === '素手'
      ? `殴りかかった` : `${weaponName}で攻撃した`;
    msg = `${pAtkStr}！${battle.enemyName}に ${dmg} ダメージ。`;
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
  let _er = calcEnemyAction();
  let enemyMsg = typeof _er === 'string' ? _er : (_er.msg || '');
  let isDead   = typeof _er === 'object' ? !!_er.isDead : false;

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

  // 投げたターンはキャンセル
  if (battle.feedThisTurn) {
    battle.feedThisTurn = false;
    battle.strongAttackCounter++; // カウンターは進む
    return { msg: '？？？はそれを食べている……攻撃してこなかった。', isDead: false };
  }

  // ボス戦の場合：3ターンごとに強攻撃（射程1〜5）
  if ((battle.isSeaBoss || battle.isNaoto)) {
    battle.strongAttackCounter++;
    if (battle.strongAttackCounter % 3 === 0) {
      // 強攻撃：射程1〜5（どこにいても当たる）
      let dmg = 30;
      player.hp -= dmg;
      player.hp = max(0, player.hp);
      msg = `<span style="color:#ff6060">！？？？の強攻撃！${dmg} ダメージを受けた！（射程1〜5の全力攻撃）</span>`;
      if (player.hp <= 0) msg += '<!-- isDead -->';  return { msg, isDead: player.hp <= 0 };
    }
  }

  if (battle.distance <= battle.enemyRange) {
    // 射程内 → 通常攻撃
    let dmg = battle.enemyAtk + floor(random(0, 2));
    player.hp -= dmg;
    player.hp = max(0, player.hp);
    let atkDescs = e && e.atkDesc ? e.atkDesc : ['攻撃してきた'];
    let atkStr = atkDescs[Math.floor(Math.random() * atkDescs.length)];
    msg = `${battle.enemyName}に${atkStr}！${dmg} ダメージを受けた。`;
  } else {
    // 射程外：70%で前進、30%で様子見
    if (random() < 0.7) {
      battle.distance--;
      msg = `${battle.enemyName}が前進した。距離：${battle.distance}`;
    } else {
      msg = `${battle.enemyName}は様子を見ている。`;
    }
  }
  if (player.hp <= 0) msg += '<!-- isDead -->';  return { msg, isDead: player.hp <= 0 };
}


// =====================
// 戦闘：観察ヒント
// =====================
function getBattleObserveHint() {
  let turns_to_strong = (battle.isSeaBoss || battle.isNaoto)
    ? 3 - (battle.strongAttackCounter % 3)
    : null;

  if (battle.isSeaBoss) {
    let hints = [
      `海面の怪物をじっと見る。距離${battle.distance}——射程2の攻撃が届く範囲だ。`,
      `${turns_to_strong}ターン後に大きく体を膨らませてくる気がする。全力攻撃の前兆かもしれない。`,
      '素材を投げると一瞬気をそらせる。攻撃してこない間に態勢を整えられるかもしれない。',
      '射程2以上離れれば通常攻撃は届かない。ただし全力攻撃は射程5まで届くらしい。',
    ];
    return hints[Math.floor(Math.random() * hints.length)];
  }

  if (battle.isNaoto) {
    let hints = [
      `動きを観察する。距離${battle.distance}——射程2の攻撃が届く位置だ。`,
      `${turns_to_strong}ターン後に大きく腕を振りかぶる構えをするかもしれない。それが全力攻撃の予兆だ。`,
      '何かを投げると反射的に食いついてくる。その瞬間は攻撃してこない。',
      '距離3以上保てば通常攻撃は届かない。ただし全力攻撃は距離5まで届く。',
    ];
    return hints[Math.floor(Math.random() * hints.length)];
  }

  // 通常戦闘
  let e = enemyTypes[battle.enemyName];
  if (!e) return `距離${battle.distance}で対峙している。`;
  return `${battle.enemyName}を観察した。射程${e.range}、攻撃力${e.atk}程度の敵だ。距離${battle.distance}を保てば攻撃が届かない。`;
}
// =====================
// 戦闘：終了（勝利）
// =====================
function endBattle(victory) {
  if (!victory) return;

  // 海上ボス勝利
  if (battle.isSeaBoss) {
    showMessage(
      '<span style="color:#ffd700;font-size:18px;font-weight:bold">？？？を倒した！</span>',
      true,
      () => endSeaBoss()
    );
    battle.active = false;
    updateParams();
    return;
  }

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
  // 初回討伐の必須ドロップ
  if (e.firstDrop && !snakeFirstKill) {
    snakeFirstKill = true;
    addItem(e.firstDrop);
    drops.push(e.firstDrop);
  }
  for (let d of e.drops) {
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
  // 1〜4層（layer 0〜3）：1体で層UP / 5層以降：2体で層UP
  let killsNeeded = (layer <= 3) ? 1 : 2;
  if (placeKillCounts[placeKey] >= killsNeeded) {
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
  let timePassed = Math.max(0, Math.floor(battle.turns / 2));
  elapsedTime += timePassed;
  // クールダウン減少（通常のpassTimeは使わない＝回復なし）
  for (let p in exploreCooldown) {
    exploreCooldown[p] = max(0, exploreCooldown[p] - timePassed);
  }
  // 焚火燃料は戦闘時間でも減少しない
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


