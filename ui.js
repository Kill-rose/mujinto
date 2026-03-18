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

// =====================
// トランシーバーエンディング
// =====================
function showTransceiverEnding() {
  clearUI();
  container.html('');
  let endDiv = createDiv().parent(container);
  endDiv.elt.style.cssText = `
    width:100%; height:100%;
    display:flex; flex-direction:column;
    justify-content:center; align-items:center;
    text-align:center; padding:40px;
    background: radial-gradient(ellipse at center, #0a1828 0%, #04080e 70%);
  `;
  let title = keiPlazaArrived ? 'ENDING: RESCUE' : 'ENDING: SIGNAL';
  let story = keiPlazaArrived
    ? `ヘリコプターは二人を乗せ、島を離れた。<br>
       ケイは窓から島を眺めていた。<br>
       「あの島のこと、いつか話せる日が来るといいですね」<br><br>
       トランシーバーは、まだ手の中にある。`
    : `ヘリコプターに乗り込んだ。<br>
       島はどんどん小さくなっていく。<br><br>
       あの島に何があったのか。まだ何も知らない。<br>
       ただ、帰ることができた。`;
  endDiv.html(`
    <div style="font-family:Cinzel,serif;font-size:clamp(22px,4.5vw,48px);color:#80b8d8;letter-spacing:0.15em;margin-bottom:20px">${title}</div>
    <div style="color:#d4d8cc;font-size:clamp(13px,1.8vw,20px);max-width:580px;line-height:1.9;margin-bottom:16px">${story}</div>
    <div style="color:#7a8572;font-size:clamp(11px,1.4vw,16px)">経過時間：${elapsedTime} 時間</div>
  `);
  let btn = createButton('タイトルに戻る').parent(endDiv);
  btn.elt.style.cssText = 'margin-top:32px;font-size:clamp(13px,1.8vw,18px);padding:10px 36px;background:transparent;border:1px solid #284a60;color:#80b8d8;cursor:pointer;';
  btn.mousePressed(() => location.reload());
}
function showOpening() {
  actionPanel.html('');
  rightWindow.html('');

  // オープニングテキスト（クリックで進む）
  showMessage(
    '2024年10月——<br>' +
    'クルーズ船「さくら丸」は、太平洋上を航行していた。<br>' +
    '船上では、見知らぬ誰かに声をかけられた記憶がある。<br>' +
    '「この航路は景色がいいですよ」と、その人物は言った。',
    true,
    () => showMessage(
      '気づいたとき、砂浜に倒れていた。<br><br>' +
      '波の音。カモメの声。<br>' +
      '周囲に人影はない。<br>' +
      '……船は、沈んだのだ。',
      true,
      () => showMessage(
        'ここはどこだ。<br>' +
        '地図にない島。誰も知らない場所。<br><br>' +
        '体はボロボロだが、動ける。<br>' +
        'このまま死ぬわけにはいかない。',
        true,
        () => showTitleMenu()
      )
    )
  );
}

function showTitleMenu() {
  actionPanel.html('');

  createButton('ゲーム開始').parent(actionPanel).mousePressed(() => {
    state = 'game';
    updateParams();
    showMainActions();
  });

  if (localStorage.getItem('savedata')) {
    createButton('続きから').parent(actionPanel).mousePressed(() => {
      loadAndRefresh();
    });
  }

  createButton('遊び方').parent(actionPanel).mousePressed(() => showHowToPlay());

  createButton('README').parent(actionPanel).mousePressed(() => {
    actionPanel.html('');
    textZone.elt.innerHTML = '';
    fetch('readme.md')
      .then(r => r.text())
      .then(txt => {
        let html = txt
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .split('\n').join('<br>');
        textZone.elt.innerHTML = html;
      })
      .catch(() => { textZone.elt.innerHTML = 'readme.md が見つかりませんでした。'; });
    createButton('タイトルに戻る').parent(actionPanel).mousePressed(() => {
      actionPanel.html('');
      showTitleMenu();
    });
  });
}

// =====================
// 遊び方
// =====================
function showHowToPlay() {
  const pages = [
    // ページ1：基本
    `<b>【遊び方 1/4：基本の流れ】</b><br><br>
    このゲームは <b>テキストRPG</b> です。<br>
    操作パネルのボタンを押して行動を選びます。<br><br>
    ・<b>探索</b>……その場所でアイテムを探す。敵に遭遇することも。<br>
    ・<b>移動</b>……別の場所へ移動する。<br>
    ・<b>待機</b>……時間を経過させる。焚火があれば回復。<br>
    ・<b>制作</b>……アイテムを作る。<b>広場でのみ可能。</b>`,

    // ページ2：アイテム
    `<b>【遊び方 2/4：アイテムの使い方】</b><br><br>
    右パネルのアイテム一覧からアイテムを<b>タップ/クリックで選択</b>できます。<br><br>
    ・<b>使用</b>……食べ物は食べる。設置できるものは設置する。<br>
    　<span style="color:var(--accent)">→ 焚火・いかだは「使用」すると広場に設置されます</span><br>
    ・<b>説明</b>……アイテムの情報を見る。使い方のヒントが書いてあります。<br>
    ・<b>捨てる</b>……不要なアイテムを捨てる。`,

    // ページ3：時間とストーリー
    `<b>【遊び方 3/4：時間とストーリー】</b><br><br>
    行動するたびに<b>時間が経過</b>します。<br>
    時間によってイベントや選択肢が変わります。<br><br>
    ・100時間……重要な変化が起きる（詳しくは探索で確かめよう）<br>
    ・150時間……ある人物の状態が変わる<br><br>
    <b>セリフや資料はよく読みましょう。</b>ヒントが隠れています。`,

    // ページ4：脱出ルートと詰み防止
    `<b>【遊び方 4/4：脱出ルートと注意点】</b><br><br>
    脱出方法は複数あります。どれを目指すかで体験が変わります。<br><br>
    ・<b>いかだ</b>……木材と紐で作れる。ただし<b>一人でないと乗れない</b>。<br>
    ・<b>トランシーバー</b>……洞窟の奥にある。100時間以降に使える。<br>
    ・<b>謎解きルート</b>……研究所にカギがある。<b>ある人物との協力が必要。</b><br><br>
    <span style="color:var(--accent)">詰まったら「説明」ボタンや「資料」ボタンを読んでみよう。</span>`,
  ];

  let page = 0;
  function showPage() {
    showMessage(pages[page], true, () => {
      page++;
      if (page < pages.length) {
        showPage();
      } else {
        actionPanel.html('');
        showTitleMenu();
      }
    });
    actionPanel.html('');
    if (page < pages.length - 1) {
      createButton('次へ').parent(actionPanel).mousePressed(() => {
        page++;
        showPage();
      });
    } else {
      createButton('タイトルに戻る').parent(actionPanel).mousePressed(() => {
        actionPanel.html('');
        showTitleMenu();
      });
    }
  }
  showPage();
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

  // トランシーバー：クリア（100時間以降のみ動作）
  if (name === 'トランシーバー') {
    if (elapsedTime < 100) {
      showMessage('電源を入れたが、何も繋がらない。まだ時間が早いのかもしれない。');
      return;
    }
    showMessage(
      'トランシーバーのスイッチを入れた。<br>' +
      'ザザ……と雑音の後、声が聞こえた。<br>' +
      '「こちら救助隊です。位置を確認しました。今すぐ向かいます！」',
      true,
      () => {
        showMessage(
          'しばらくして、ヘリコプターの音が近づいてきた。<br>' +
          (keiPlazaArrived
            ? 'ケイが隣に立っていた。「……よかった」と、小さく呟いた。'
            : '砂浜に一人立って、空を見上げた。'),
          true,
          () => showTransceiverEnding()
        );
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
    hasLabRecord = true;
    showMessage(
      '「研究所の記録」を確認した。<br>' +
      'プロジェクト・タイダルの全記録がここにある。これを持ち出せば証拠になる。<br>' +
      '<span style="color:var(--accent)">（謎解きルートの条件を満たした。いかだかトランシーバーで脱出しよう）</span>'
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

  // 既存オーバーレイを削除して再生成
  let oldOv = select('#recipeOverlay');
  if (oldOv) oldOv.remove();

  // スクロール位置を保存
  let savedScroll = 0;
  let oldListEl = document.getElementById('recipeList');
  if (oldListEl) savedScroll = oldListEl.scrollTop;

  // 全画面オーバーレイを作成
  let overlay = createDiv().id('recipeOverlay').parent(container);

  // タイトル
  let rH2 = createElement('h2', '制作レシピ').parent(overlay);
  rH2.id('recipeH2');

  // レシピリスト
  let listDiv = createDiv().id('recipeList').parent(overlay);
  if (savedScroll > 0) setTimeout(() => { listDiv.elt.scrollTop = savedScroll; }, 0);
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
  // 所要時間をボタンに表示
  let craftLabel = selectedRecipe && recipes[selectedRecipe]
    ? `制作する（${recipes[selectedRecipe].time}時間）`
    : '制作する';
  let btnCraft = createButton(craftLabel).parent(btnDiv);
  if (!selectedRecipe) btnCraft.attribute('disabled', 'true');
  btnCraft.mousePressed(() => { if (selectedRecipe) craftItem(selectedRecipe); });
  createButton('閉じる').parent(btnDiv).mousePressed(() => {
    showRecipes = false;
    selectedRecipe = null;
    // オーバーレイごと削除
    let ov = select('#recipeOverlay');
    if (ov) ov.remove();
    updateElapsedTime();
    showMessage(''); // テキストゾーンをクリア
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
