function saveGame() {
  if (battle.active) { showMessage('戦闘中はセーブできません。'); return; }
  try {
    const data = {
      player:              JSON.parse(JSON.stringify(player)),
      elapsedTime,
      exploreCounts:       JSON.parse(JSON.stringify(exploreCounts)),
      exploreCooldown:     JSON.parse(JSON.stringify(exploreCooldown)),
      currentPlace,
      placeLayers:         JSON.parse(JSON.stringify(placeLayers)),
      maxLayers:           JSON.parse(JSON.stringify(maxLayers)),
      itemCounts:          JSON.parse(JSON.stringify(itemCounts)),
      hasCampfire, campfireFuel, hasRaft,
      keiState, keiTalkCount, forest8EventDone, keiHealDone, keiPlazaArrived,
      forest3EventDone,
      labUnlocked, labHasKey, labGunTaken, labNaotoMet, labNaotoDead,
      labGlueMaterialTaken, currentRoom,
      keiLabTalkCounts: JSON.parse(JSON.stringify(keiLabTalkCounts)),
    };
    localStorage.setItem('savedata', JSON.stringify(data));
    showMessage('セーブしました。（経過時間：' + elapsedTime + '時間）');
    updateParams(); // セーブボタンの状態更新
  } catch(e) {
    showMessage('セーブに失敗しました：' + e.message);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('savedata');
    if (!raw) { showMessage('セーブデータがありません。'); return false; }
    const d = JSON.parse(raw);
    player.hp    = d.player.hp;
    player.mp    = d.player.mp;
    elapsedTime  = d.elapsedTime;
    Object.assign(exploreCounts,   d.exploreCounts   || {});
    Object.assign(exploreCooldown, d.exploreCooldown || {});
    currentPlace = d.currentPlace;
    Object.assign(placeLayers, d.placeLayers || {});
    Object.assign(maxLayers,   d.maxLayers   || {});
    // itemCountsは完全置換
    for (let k in itemCounts) delete itemCounts[k];
    Object.assign(itemCounts, d.itemCounts || {});
    hasCampfire          = !!d.hasCampfire;
    campfireFuel         = d.campfireFuel   || 0;
    hasRaft              = !!d.hasRaft;
    selectedItem         = null;
    keiState             = d.keiState             || 'unknown';
    keiTalkCount         = d.keiTalkCount         || 0;
    forest8EventDone     = !!d.forest8EventDone;
    keiHealDone          = !!d.keiHealDone;
    keiPlazaArrived      = !!d.keiPlazaArrived;
    forest3EventDone     = !!d.forest3EventDone;
    labUnlocked          = !!d.labUnlocked;
    labHasKey            = !!d.labHasKey;
    labGunTaken          = !!d.labGunTaken;
    labNaotoMet          = !!d.labNaotoMet;
    labNaotoDead         = !!d.labNaotoDead;
    labGlueMaterialTaken = !!d.labGlueMaterialTaken;
    currentRoom          = d.currentRoom || null;
    if (d.keiLabTalkCounts) Object.assign(keiLabTalkCounts, d.keiLabTalkCounts);
    return true;
  } catch(e) {
    showMessage('ロードに失敗しました：' + e.message);
    return false;
  }
}

// ロード後に画面を再構築
function loadAndRefresh() {
  if (loadGame()) {
    state = 'game';
    updateBgImage(currentRoom ? '洞窟' : currentPlace);
    updateElapsedTime();
    updateParams();
    showMainActions();
  }
}

// =====================
// ゲームオーバー
// =====================
function gameOver() {
  state = 'gameover';
  battle.active = false;
  clearUI();
  container.html('');
  let overDiv = createDiv().parent(container);
  overDiv.elt.style.cssText = `
    width:100%; height:100%;
    display:flex; flex-direction:column;
    justify-content:center; align-items:center;
    background: radial-gradient(ellipse at center, #2a0a0a 0%, #0d0000 70%);
  `;
  createDiv().parent(overDiv).html(
    '<div style="font-family:Cinzel,serif;font-size:clamp(36px,6vw,72px);color:#c0503a;letter-spacing:0.15em;text-shadow:0 0 30px rgba(192,80,58,0.8)">GAME OVER</div>'
  );
  createDiv().parent(overDiv).html(
    `<div style="color:#7a5550;font-size:clamp(14px,2vw,20px);margin-top:16px">経過時間：${elapsedTime} 時間</div>`
  );
  let btn = createButton('タイトルに戻る').parent(overDiv);
  btn.elt.style.cssText = 'margin-top:40px;font-size:clamp(14px,2vw,20px);padding:14px 40px;background:transparent;border:1px solid #7a5550;color:#c0503a;cursor:pointer;letter-spacing:0.1em;';
  btn.mousePressed(() => location.reload());
}

function clearUI() {
  leftWindow.remove();
  rightWindow.remove();
}


setup();
