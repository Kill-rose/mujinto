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

  let btnDiv = createDiv().id('craftButtons').parent(overlay);
  let btnCraft = createButton('制作する').parent(btnDiv);
  if (!selectedRecipe) btnCraft.attribute('disabled', 'true');
  btnCraft.mousePressed(() => { if (selectedRecipe) craftItem(selectedRecipe); });
  createButton('閉じる').parent(btnDiv).mousePressed(() => {
    showRecipes = false;
    selectedRecipe = null;
    // オーバーレイごと削除
    let ov = select('#recipeOverlay');
    if (ov) ov.remove();
    updateElapsedTime();
  });
}

// =====================
// アイテム制作
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
