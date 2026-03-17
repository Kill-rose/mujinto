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

