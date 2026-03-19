function setup() {
  // コンテナ生成
  container   = createDiv().id('container');
  document.body.appendChild(container.elt);

  // DOM全構築
  leftWindow  = createDiv().id('leftWindow').parent(container);
  leftTop     = createDiv().id('leftTop').parent(leftWindow);
  createDiv().id('infoOverlay').parent(leftTop);
  leftBottom  = createDiv().id('leftBottom').parent(leftWindow);
  textZone    = createDiv().id('textZone').parent(leftBottom);
  actionPanel = createDiv().id('actionPanel').parent(leftBottom);
  rightWindow = createDiv().id('rightWindow').parent(container);

  updateBgImage('広場');
  updateElapsedTime();

  showMessage('無人島サバイバル');
  createButton('ゲーム開始').parent(actionPanel).mousePressed(() => {
    actionPanel.html('');
    state = 'game';
    updateParams(true);
    showMainActions();
  });
  if (localStorage.getItem('savedata')) {
    createButton('続きから').parent(actionPanel).mousePressed(() => loadAndRefresh());
  }
  createButton('🔧 デバッグ').parent(actionPanel).mousePressed(() => {
    debugMode = true;
    player.hp = MAX_HP;
    player.mp = MAX_MP;
    actionPanel.html('');
    state = 'game';
    updateParams(true);
    showMainActions();
  });
}

// =====================
// メッセージ表示
// =====================

// タイプライター用の状態
let _typeTimer = null;      // setIntervalのID
let _typeFullHtml = '';     // 最終的なHTML全文
let _typeOnDone = null;     // 文字出し終了後のコールバック

// バックログ
let _backlog = [];          // テキスト履歴（プレーンテキスト）
let _backlogOpen = false;   // バックログ画面表示中か
let _debugLog = [];         // デバッグログ
let _typeSpeed = parseInt(localStorage.getItem('typeSpeed') || '18', 10); // ms/文字

// HTMLタグを考慮しながら1文字ずつ出すタイプライター
function startTypewriter(html, onDone) {
  // 前のタイマーをキャンセル
  if (_typeTimer !== null) { clearInterval(_typeTimer); _typeTimer = null; }

  _typeFullHtml = html;
  _typeOnDone   = onDone;

  // HTMLをトークン列（タグor文字）に分解
  const tokens = [];
  const re = /(<[^>]+>|&[a-z#0-9]+;|.)/gs;
  let m;
  while ((m = re.exec(html)) !== null) tokens.push(m[0]);

  let idx = 0;
  let buf = '';
  const SPEED = _typeSpeed; // ms/文字（グローバル設定値）

  textZone.elt.innerHTML = '';
  _typeTimer = setInterval(() => {
    if (idx >= tokens.length) {
      clearInterval(_typeTimer);
      _typeTimer = null;
      textZone.elt.innerHTML = _typeFullHtml; // 最終的に完全なHTMLをセット
      if (typeof _typeOnDone === 'function') _typeOnDone();
      return;
    }
    // タグはスキップ（まとめて追加）、文字は1つずつ
    const tok = tokens[idx++];
    buf += tok;
    textZone.elt.innerHTML = buf;
  }, SPEED);
}

function skipTypewriter() {
  // タイプ中にクリック→即全表示
  if (_typeTimer !== null) {
    clearInterval(_typeTimer);
    _typeTimer = null;
    textZone.elt.innerHTML = _typeFullHtml;
    if (typeof _typeOnDone === 'function') {
      const cb = _typeOnDone;
      _typeOnDone = null;
      cb();
    }
  }
}

// タイプ中のパネルスキップリスナー（グローバルで1つだけ管理）
let _panelSkipHandler = null;

function _lockPanel() {
  if (!actionPanel || !actionPanel.elt) return;
  // 既存リスナーをまず必ず除去してから登録（二重登録防止）
  if (_panelSkipHandler) {
    actionPanel.elt.removeEventListener('click', _panelSkipHandler, true);
  }
  _panelSkipHandler = function(e) {
    e.stopPropagation();
    e.preventDefault();
    _unlockPanel();
    skipTypewriter(); // 全表示＋onDone実行
  };
  actionPanel.elt.style.opacity       = '0.4';
  actionPanel.elt.style.pointerEvents = 'none';
  actionPanel.elt.style.cursor        = 'pointer';
  // capture:trueでポインターイベント無効でもキャプチャできる
  actionPanel.elt.addEventListener('click', _panelSkipHandler, { capture: true, once: true });
}

function _unlockPanel() {
  if (!actionPanel || !actionPanel.elt) return;
  if (_panelSkipHandler) {
    actionPanel.elt.removeEventListener('click', _panelSkipHandler, true);
    _panelSkipHandler = null;
  }
  actionPanel.elt.style.opacity       = '1';
  actionPanel.elt.style.pointerEvents = 'auto';
  actionPanel.elt.style.cursor        = '';
  actionPanel.elt.style.visibility    = 'visible';
}

function showMessage(msg, waitForClick = false, afterFunc = null) {
  // バックログに追加（HTMLタグを除いたテキストを記録）
  const plain = msg.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, ' ').trim();
  if (plain) _backlog.push(plain);

  // 実行中のタイプライターを即終了
  if (_typeTimer !== null) { clearInterval(_typeTimer); _typeTimer = null; }
  _unlockPanel();
  textZone.elt.removeEventListener('click', onMessageClick);

  if (waitForClick) {
    messageWaiting = true;
    nextAction = afterFunc;
    textZone.style('cursor', 'default'); // タイプ中はdefault
    textZone.addClass('waiting');
    _lockPanel(); // タイプ中グレーアウト
    startTypewriter(msg, () => {
      // タイプ完了→クリック待ちへ
      _unlockPanel();                    // パネル解放
      textZone.style('cursor', 'pointer');
      textZone.elt.addEventListener('click', onMessageClick);
      // クリック待ち中はパネルを再グレーアウト
      if (actionPanel && actionPanel.elt) {
        actionPanel.elt.style.opacity       = '0.4';
        actionPanel.elt.style.pointerEvents = 'none';
        actionPanel.elt.style.cursor        = '';
      }
    });
  } else {
    messageWaiting = false;
    nextAction = null;
    textZone.style('cursor', 'default');
    textZone.removeClass('waiting');
    _lockPanel(); // タイプ中グレーアウト
    startTypewriter(msg, () => {
      _unlockPanel(); // タイプ完了でパネル解放
      if (typeof afterFunc === 'function') afterFunc(); // ← afterFuncを実行
    });
  }
}

// =====================
// バックログ
// =====================
function addDebugLog(msg) {
  let ts = elapsedTime != null ? `[${elapsedTime}h]` : '';
  _debugLog.push(ts + ' ' + msg);
  if (_debugLog.length > 200) _debugLog.shift();
}

function showBacklog() {
  if (_backlogOpen) return;
  _backlogOpen = true;

  let ov = document.createElement('div');
  ov.id = 'backlogOverlay';
  ov.style.cssText = `position:fixed;inset:0;z-index:200;background:rgba(10,14,10,0.97);
    display:flex;flex-direction:column;font-family:'Noto Serif JP',serif;`;

  // ヘッダー（タブ付き）
  let header = document.createElement('div');
  header.style.cssText = `display:flex;justify-content:space-between;align-items:center;
    padding:8px 14px;border-bottom:1px solid #3a4235;flex:0 0 auto;gap:8px;`;

  let tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;gap:6px;';

  let closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ 閉じる';
  closeBtn.style.cssText = 'font-size:clamp(11px,1.6vw,15px);padding:5px 14px;background:transparent;border:1px solid #3a4235;color:#7a8572;cursor:pointer;';
  closeBtn.onclick = () => { document.body.removeChild(ov); _backlogOpen = false; };

  header.appendChild(tabs);
  header.appendChild(closeBtn);
  ov.appendChild(header);

  // 注記
  let note = document.createElement('div');
  note.style.cssText = 'color:#4a5245;font-size:clamp(9px,1.3vw,12px);padding:3px 14px;flex:0 0 auto;border-bottom:1px solid #1e2418;';
  note.textContent = '長押し/ドラッグでテキストを選択してコピーできます';
  ov.appendChild(note);

  // コンテンツエリア
  let content = document.createElement('div');
  content.style.cssText = `flex:1;overflow-y:auto;padding:10px 14px;
    display:flex;flex-direction:column-reverse;gap:6px;
    user-select:text;-webkit-user-select:text;`;
  ov.appendChild(content);

  function renderTab(type) {
    content.innerHTML = '';
    let list = type === 'debug' ? [..._debugLog] : [..._backlog];
    [...list].reverse().forEach((text, i) => {
      let e = document.createElement('div');
      let isDebug = type === 'debug';
      e.style.cssText = `
        color:${isDebug ? '#7aaa60' : '#d4d8cc'};
        font-size:clamp(${isDebug ? '11px' : '13px'},${isDebug ? '1.5vw' : '1.8vw'},${isDebug ? '14px' : '17px'});
        font-family:${isDebug ? 'monospace' : "'Noto Serif JP',serif"};
        line-height:1.6;padding:6px 10px;
        border-left:2px solid ${i===0 ? '#5a7a38' : '#1e2a1e'};
        background:${i===0 ? 'rgba(58,96,48,0.08)' : 'transparent'};
        user-select:text;-webkit-user-select:text;cursor:text;
        white-space:pre-wrap;word-break:break-all;
      `;
      e.textContent = text;
      content.appendChild(e);
    });
    if (list.length === 0) {
      let e = document.createElement('div');
      e.style.cssText = 'color:#4a5245;font-size:13px;text-align:center;padding:40px;';
      e.textContent = 'ログがありません';
      content.appendChild(e);
    }
  }

  // タブボタン作成
  let currentTab = 'story';
  function makeTab(label, key) {
    let btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.tab = key;
    btn.style.cssText = `font-size:clamp(11px,1.6vw,15px);padding:5px 14px;cursor:pointer;
      border:1px solid #3a4235;background:${key===currentTab?'rgba(58,96,48,0.4)':'transparent'};
      color:${key===currentTab?'#a8d888':'#7a8572'};`;
    btn.onclick = () => {
      currentTab = key;
      tabs.querySelectorAll('button').forEach(b => {
        b.style.background = b.dataset.tab===key ? 'rgba(58,96,48,0.4)' : 'transparent';
        b.style.color = b.dataset.tab===key ? '#a8d888' : '#7a8572';
      });
      renderTab(key);
    };
    tabs.appendChild(btn);
  }
  makeTab('ストーリーログ', 'story');
  makeTab('デバッグログ', 'debug');

  renderTab('story');
  document.body.appendChild(ov);
}


// 戦闘専用メッセージ表示（タイプライターなし・即表示）
function showBattleMessage(msg, waitForClick = false, afterFunc = null) {
  // バックログに追加
  const plain = msg.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, ' ').trim();
  if (plain) _backlog.push(plain);

  // タイプライター完全停止・パネル系リスナー全解除
  if (_typeTimer !== null) { clearInterval(_typeTimer); _typeTimer = null; }
  if (_panelSkipHandler) {
    actionPanel.elt.removeEventListener('click', _panelSkipHandler, true);
    _panelSkipHandler = null;
  }
  textZone.elt.removeEventListener('click', onMessageClick);

  // パネルを確実に解放（_unlockPanel経由だとリスナー除去が競合するので直接set）
  if (actionPanel && actionPanel.elt) {
    actionPanel.elt.style.opacity       = '1';
    actionPanel.elt.style.pointerEvents = 'auto';
    actionPanel.elt.style.cursor        = '';
    actionPanel.elt.style.visibility    = 'visible';
  }

  // 即時表示
  textZone.html(msg);

  if (waitForClick) {
    messageWaiting = true;
    nextAction = afterFunc;
    textZone.style('cursor', 'pointer');
    textZone.addClass('waiting');
    // クリック待ち中だけパネルを操作不可に
    if (actionPanel && actionPanel.elt) {
      actionPanel.elt.style.opacity       = '0.4';
      actionPanel.elt.style.pointerEvents = 'none';
    }
    textZone.elt.addEventListener('click', onMessageClick);
  } else {
    messageWaiting = false;
    nextAction = null;
    textZone.style('cursor', 'default');
    textZone.removeClass('waiting');
    if (typeof afterFunc === 'function') afterFunc();
  }
}
function onMessageClick() {
  if (!messageWaiting) return;
  messageWaiting = false;
  textZone.style('cursor', 'default');
  textZone.elt.removeEventListener('click', onMessageClick);
  textZone.removeClass('waiting');
  // パネルを完全解放
  if (actionPanel && actionPanel.elt) {
    actionPanel.elt.style.visibility    = 'visible';
    actionPanel.elt.style.opacity       = '1';
    actionPanel.elt.style.pointerEvents = 'auto';
    actionPanel.elt.style.cursor        = '';
  }
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
// =====================
// タイトル画面（独立レイアウト）
// =====================
function showOpening() {
  // container全体をタイトル画面に置き換え
  container.html('');
  container.style('flex-direction', 'column');
  container.style('justify-content', 'center');
  container.style('align-items', 'center');
  container.style('background', 'radial-gradient(ellipse at 40% 60%, #0d2010 0%, #050e06 60%, #000 100%)');
  container.elt.id = 'titleScreen';

  let titleDiv = createDiv().parent(container);
  titleDiv.elt.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:clamp(12px,2.5vh,28px);width:100%;max-width:480px;padding:20px;';

  // ゲームタイトル
  let h = createDiv().parent(titleDiv);
  h.elt.innerHTML = `
    <div style="font-family:Cinzel,serif;font-size:clamp(28px,6vw,64px);color:#8fbc5a;letter-spacing:0.15em;text-align:center;line-height:1.2;text-shadow:0 0 40px rgba(143,188,90,0.4)">
      無人島<br>サバイバル
    </div>
    <div style="color:#4a6a38;font-size:clamp(11px,1.8vw,16px);letter-spacing:0.2em;text-align:center;margin-top:8px;font-family:Cinzel,serif">
      UNINHABITED ISLAND
    </div>
  `;

  // 区切り線
  let sep = createDiv().parent(titleDiv);
  sep.elt.style.cssText = 'width:clamp(160px,40vw,280px);height:1px;background:linear-gradient(to right,transparent,#3a6030,transparent);';

  // メニューボタン群
  let menu = createDiv().parent(titleDiv);
  menu.elt.style.cssText = 'display:flex;flex-direction:column;gap:clamp(8px,1.5vh,14px);width:100%;';

  function titleBtn(label, fn, accent) {
    let b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `
      width:100%; font-family:'Noto Serif JP',serif;
      font-size:clamp(16px,2.8vw,26px);
      padding:clamp(12px,2vh,20px) 0;
      background:${accent ? 'rgba(58,96,48,0.35)' : 'rgba(30,40,28,0.5)'};
      border:1px solid ${accent ? '#5a8040' : '#3a4235'};
      color:${accent ? '#a8d888' : '#8a9882'};
      cursor:pointer; border-radius:2px; letter-spacing:0.08em;
      transition:background 0.2s, color 0.2s;
    `;
    b.addEventListener('mouseenter', () => {
      b.style.background = accent ? 'rgba(80,130,60,0.45)' : 'rgba(50,60,45,0.6)';
      b.style.color = '#d4d8cc';
    });
    b.addEventListener('mouseleave', () => {
      b.style.background = accent ? 'rgba(58,96,48,0.35)' : 'rgba(30,40,28,0.5)';
      b.style.color = accent ? '#a8d888' : '#8a9882';
    });
    b.addEventListener('click', fn);
    menu.elt.appendChild(b);
    return b;
  }

  titleBtn('▶  開始', () => startOpening(), true);

  if (localStorage.getItem('savedata')) {
    titleBtn('📂  ロード', () => loadAndRefresh(), false);
  }

  titleBtn('📖  遊び方', () => showTitleSubPage('howtoplay'), false);
  titleBtn('⚔  攻略',   () => showTitleSubPage('guide'), false);

  // デバッグモードボタン（開発用）
  titleBtn('🔧  デバッグ', () => {
    debugMode = true;
    startOpening();
  }, false);
}

// 「開始」→オープニングテキスト→ゲームへ
function startOpening() {
  // タイトル画面を通常ゲームレイアウトに戻す
  container.elt.id = 'container';
  container.html('');
  container.style('flex-direction', 'row');
  container.style('justify-content', '');
  container.style('align-items', '');
  container.style('background', '');

  // DOM再構築
  leftWindow  = createDiv().id('leftWindow').parent(container);
  leftTop     = createDiv().id('leftTop').parent(leftWindow);
  createDiv().id('infoOverlay').parent(leftTop);
  leftBottom  = createDiv().id('leftBottom').parent(leftWindow);
  textZone    = createDiv().id('textZone').parent(leftBottom);
  actionPanel = createDiv().id('actionPanel').parent(leftBottom);
  rightWindow = createDiv().id('rightWindow').parent(container);

  updateBgImage('広場');

  // ★ 診断用：ボタンが表示されるか確認
  let testBtn = createButton('▶ クリックして進める').parent(actionPanel);
  testBtn.mousePressed(() => {
    actionPanel.html('');
    // オープニングテキスト開始
    runOpeningText();
  });
}

function runOpeningText() {
  // オープニングテキスト
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
        () => {
          state = 'game';
          updateParams(true); // messageWaiting中でも強制描画
          showMainActions();
        }
      )
    )
  );
  actionPanel.html('');
  // ※ rightWindow.html('')はここで呼ばない（updateParamsで構築済み）
}

// タイトル画面のサブページ（遊び方・攻略）
function showTitleSubPage(type) {
  container.html('');
  container.style('flex-direction', 'column');
  container.style('justify-content', 'flex-start');
  container.style('align-items', 'center');
  container.style('background', '#0d0f0e');
  container.style('overflow-y', 'auto');

  let wrap = createDiv().parent(container);
  wrap.elt.style.cssText = 'width:100%;max-width:640px;padding:clamp(16px,4vw,40px);';

  if (type === 'howtoplay') {
    wrap.elt.innerHTML = `
      <h1 style="font-family:Cinzel,serif;color:#c9a84c;font-size:clamp(18px,3vw,28px);margin:0 0 20px;border-bottom:1px solid #3a4235;padding-bottom:8px;">遊び方</h1>
      <h2 style="color:#8fbc5a;font-size:clamp(14px,2.2vw,20px);margin:16px 0 8px;">基本の流れ</h2>
      <p style="color:#d4d8cc;line-height:1.8;font-size:clamp(13px,1.8vw,17px);">
        操作パネルのボタンを選んで行動します。<br>
        <b style="color:#a8d888">探索</b>……アイテム収集・敵遭遇。クールダウンあり。<br>
        <b style="color:#a8d888">前進</b>……森・洞窟で確実に戦闘。<br>
        <b style="color:#a8d888">移動</b>……場所を移動。移動先のクールダウンがリセット。<br>
        <b style="color:#a8d888">待機</b>……時間経過。焚火があれば回復。<br>
        <b style="color:#a8d888">制作</b>……広場でのみ使用可能。
      </p>
      <h2 style="color:#8fbc5a;font-size:clamp(14px,2.2vw,20px);margin:16px 0 8px;">アイテムの使い方</h2>
      <p style="color:#d4d8cc;line-height:1.8;font-size:clamp(13px,1.8vw,17px);">
        右パネルでアイテムを選択してボタンを押します。<br>
        <b style="color:#a8d888">使用</b>……食べる・設置する。<span style="color:#c9a84c">焚火・いかだは「使用」で広場に設置。</span><br>
        <b style="color:#a8d888">説明</b>……使い方のヒントが読めます。<br>
        <b style="color:#a8d888">捨てる</b>……アイテムを捨てる。
      </p>
      <h2 style="color:#8fbc5a;font-size:clamp(14px,2.2vw,20px);margin:16px 0 8px;">時間について</h2>
      <p style="color:#d4d8cc;line-height:1.8;font-size:clamp(13px,1.8vw,17px);">
        行動するたびに時間が経過します。時間によってイベントや状況が変わります。<br>
        <span style="color:#c9a84c">セリフや資料にはヒントが隠れています。よく読みましょう。</span>
      </p>
      <h2 style="color:#8fbc5a;font-size:clamp(14px,2.2vw,20px);margin:16px 0 8px;">脱出ルート</h2>
      <p style="color:#d4d8cc;line-height:1.8;font-size:clamp(13px,1.8vw,17px);">
        <b style="color:#a8d888">いかだ</b>……木材と紐で制作。一人でないと乗れない。<br>
        <b style="color:#a8d888">トランシーバー</b>……洞窟の奥に。100時間以降に使える。<br>
        <b style="color:#a8d888">謎解きルート</b>……研究所のPCがカギ。ある人物との協力が必要。
      </p>
    `;
  } else {
    wrap.elt.innerHTML = `
      <h1 style="font-family:Cinzel,serif;color:#c9a84c;font-size:clamp(18px,3vw,28px);margin:0 0 20px;border-bottom:1px solid #3a4235;padding-bottom:8px;">攻略情報</h1>
      <p style="color:#7a8572;font-size:clamp(12px,1.6vw,15px);margin-bottom:16px;">※ネタバレを含みます</p>
      <h2 style="color:#8fbc5a;font-size:clamp(14px,2.2vw,20px);margin:16px 0 8px;">時間制限</h2>
      <p style="color:#d4d8cc;line-height:1.8;font-size:clamp(13px,1.8vw,17px);">
        100時間：洞窟6層で重要な変化。トランシーバーが手に入る。<br>
        150時間：研究所の廊下の状況が変わる。ケイが広場に来る。
      </p>
      <h2 style="color:#8fbc5a;font-size:clamp(14px,2.2vw,20px);margin:16px 0 8px;">探索のコツ</h2>
      <p style="color:#d4d8cc;line-height:1.8;font-size:clamp(13px,1.8vw,17px);">
        クールダウン中は移動して戻ると即リセット。<br>
        森・洞窟で「前進」を使うと確実に戦闘できる（層を上げたい時に有効）。<br>
        1〜4層は1体撃破で層UP。5層以降は2体必要。
      </p>
      <h2 style="color:#8fbc5a;font-size:clamp(14px,2.2vw,20px);margin:16px 0 8px;">戦闘のコツ</h2>
      <p style="color:#d4d8cc;line-height:1.8;font-size:clamp(13px,1.8vw,17px);">
        ？？？は3ターンごとに強攻撃（攻撃力30）。<br>
        強攻撃の前にアイテムを「投げる」とキャンセルできる。<br>
        「観察」ボタンで戦況のヒントが得られる。
      </p>
      <h2 style="color:#8fbc5a;font-size:clamp(14px,2.2vw,20px);margin:16px 0 8px;">研究室のパスワード</h2>
      <p style="color:#d4d8cc;line-height:1.8;font-size:clamp(13px,1.8vw,17px);">
        ヒントは研究所内の資料に散らばっている。<br>
        <span style="color:#c9a84c">答えは「200431」</span>（ある日付＋ある番号）。
      </p>
    `;
  }

  let backBtn = document.createElement('button');
  backBtn.textContent = '← タイトルに戻る';
  backBtn.style.cssText = 'margin-top:24px;font-size:clamp(13px,2vw,18px);padding:10px 28px;background:transparent;border:1px solid #3a4235;color:#7a8572;cursor:pointer;font-family:Noto Serif JP,serif;';
  backBtn.addEventListener('click', () => showOpening());
  wrap.elt.appendChild(backBtn);
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
  // デバッグモード表示
  let dbg = document.getElementById('debugBanner');
  if (debugMode && !dbg) {
    let b = document.createElement('div');
    b.id = 'debugBanner';
    b.style.cssText = 'position:fixed;top:0;right:0;background:#c0503a;color:#fff;font-size:12px;padding:2px 8px;z-index:9999;font-family:monospace;';
    b.textContent = 'DEBUG MODE';
    document.body.appendChild(b);
  }
  if (!showRecipes && !battle.active) {
    let layerStr = '';
    if (currentRoom !== null) {
      layerStr = `　研究所：${currentRoom}`;
    } else if (currentPlace === '森' || currentPlace === '洞窟') {
      layerStr = `　${currentPlace} ${placeLayers[currentPlace] + 1}層`;
    }
    // 背景画像を現在地に合わせて切り替え
    updateBgImage(currentRoom || currentPlace);
    // シルエットcanvasをクリア（戦闘外は非表示）
      // infoOverlayにテキスト表示
    let overlay = select('#infoOverlay');
    if (overlay) overlay.html(`<span class="info-badge">経過時間: ${elapsedTime} 時間${layerStr}</span>`);
  }
}

// 背景画像を切り替える
function updateBgImage(place) {
  // leftTop自体にbackground-imageを直接設定
  const bgMap = {
    '広場':   'hiroba',
    '森':     'mori',
    '洞窟':   'doukutu',
    '廊下':   'rouka',
    '研究室': 'kenkyusitu',
    '実験室': 'jikkensitu',
    '倉庫':   'souko',
  };
  let fname = bgMap[place] || 'hiroba';
  leftTop.style('background-image', `url('${fname}.png'), url('${fname}.jpg')`);
  leftTop.style('background-size', 'cover');
  leftTop.style('background-position', 'center');
}



// =====================
// rightWindow：ステータス＋アイテム一覧
// =====================
function updateParams(force = false) {
  // messageWaiting中は通常スキップ。ただしforce=trueなら強制描画
  if (messageWaiting && !force) return;
  if (!rightWindow || !rightWindow.elt) return; // rightWindowが未構築なら何もしない
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
      let icon = itemIcons[name] || '▪';
      let div = createDiv(`${icon} ${name} ×${itemCounts[name]}`).parent(listDiv);
      div.class('item-entry');
      if (selectedItem === name) div.addClass('selected');
      // ネイティブaddEventListenerでクロージャ選択（p5 mouseClickedバグ回避）
      div.elt.addEventListener('click', (function(n) {
        return function() { selectedItem = n; updateParams(); };
      })(name));
    }
  }

  // 戦闘中：食べ物を「食わせる」ボタン（研究所エネミーのみ）
  if (battle.active) {
    let labEnemyNames = ['ウミウシ（変異体）', 'アンコウ（変異体）', 'タコ（変異体）'];
    let isLabEnemy = labEnemyNames.includes(battle.enemyName);
    if (isLabEnemy) {
      const feedItems = ['りんご','小果実','うさぎ肉','狼の肉','干し肉','焼きうさぎ','焼き狼肉','焼き果実','焼きりんご','非常食'];
      if (selectedItem && feedItems.includes(selectedItem)) {
        let btnFeed = createButton('🍖 食わせる').parent(rightWindow);
        btnFeed.style('margin-top', '6px');
        btnFeed.style('border-color', 'var(--gold-dim)');
        btnFeed.style('color', 'var(--gold)');
        btnFeed.mousePressed(() => {
          if (!selectedItem || !itemCounts[selectedItem]) return;
          let fname = selectedItem;
          itemCounts[fname]--;
          if (itemCounts[fname] <= 0) { delete itemCounts[fname]; selectedItem = null; }
          // ランダム効果：HP減少 or 行動停止1ターン
          if (Math.random() < 0.5) {
            let dmg = Math.floor(Math.random() * 4) + 3;
            battle.enemyHp = max(0, battle.enemyHp - dmg);
            showMessage(`「${fname}」を${battle.enemyName}に投げ与えた。<br>むさぼり食っている間に ${dmg} ダメージ！`);
          } else {
            battle.stunned = true;
            showMessage(`「${fname}」を${battle.enemyName}に投げ与えた。<br>気が散って動きが止まった！（次ターン行動しない）`);
          }
          updateParams();
          showBattleActions();
        });
      }
    }
  }

  // 使用・捨てるボタン（戦闘中は非表示）
  if (!battle.active) {
    let btnDiv = createDiv().id('itemButtons').parent(rightWindow);
    // messageWaiting中はボタン群をグレーアウト
    if (messageWaiting) {
      btnDiv.style('opacity', '0.4');
      btnDiv.style('pointer-events', 'none');
    }
    let btnUse = createButton('使用').parent(btnDiv);
    if (!selectedItem) btnUse.attribute('disabled', 'true');
    btnUse.mousePressed(() => { if (selectedItem) useItem(selectedItem); });

    // 説明ボタン
    let btnDesc = createButton('説明').parent(btnDiv);
    if (!selectedItem) btnDesc.attribute('disabled', 'true');
    btnDesc.mousePressed(() => {
      if (!selectedItem) return;
      let prevMsg = textZone.elt.innerHTML;
      // 資料アイテムはdocumentContentsから内容を表示
      let content = (typeof documentContents !== 'undefined' && documentContents[selectedItem])
        ? documentContents[selectedItem]
        : null;
      let desc = content || itemDescriptions[selectedItem] || '特に説明はない。';
      showMessage(`${desc}`, true, () => { showMessage(prevMsg); });
    });

    // 「焼く」ボタン：広場かつ焚火設置済み・焼けるアイテム選択時
    if (currentPlace === '広場' && hasCampfire && campfireFuel > 0 && selectedItem && grillTable[selectedItem]) {
      let btnGrill = createButton('焼く').parent(btnDiv);
      btnGrill.style('color', 'var(--gold)');
      btnGrill.mousePressed(() => {
        let g = grillTable[selectedItem];
        if (campfireFuel <= 0) { showMessage('焚火の燃料が足りない。'); return; }
        campfireFuel -= g.fuel;
        if (campfireFuel < 0) campfireFuel = 0;
        itemCounts[selectedItem]--;
        if (itemCounts[selectedItem] <= 0) { delete itemCounts[selectedItem]; }
        let result = g.result;
        addItem(result);
        selectedItem = result;
        let st = grilledFoodStats[result];
        let prevGrill = textZone.elt.innerHTML;
        showMessage(`「${result}」になった。<br>体力+${st.hp} / 気力+${st.mp}（食べると回復）`, true, () => { showMessage(prevGrill); updateParams(); });
        updateParams();
      });
    }

    // 「渡す」ボタン：ケイがmet状態かつ未回復、回復系アイテム選択時
    const healItems = ['りんご','小果実','うさぎ肉','狼の肉','干し肉','肉と薬草の包み','薬草スープ','万能薬','救急キット','焼きうさぎ','焼き狼肉','焼き果実','焼きりんご','薬草'];
    if (keiState === 'met' && !keiHealDone && selectedItem && healItems.includes(selectedItem)) {
      let btnGive = createButton('渡す').parent(btnDiv);
      btnGive.style('border-color', 'var(--accent-dim)');
      btnGive.style('color', 'var(--accent)');
      btnGive.mousePressed(() => giveItemToKei(selectedItem));
    }

    let btnDiscard = createButton('捨てる').parent(btnDiv);
    if (!selectedItem || (unconsumableItems && unconsumableItems.has(selectedItem))) btnDiscard.attribute('disabled', 'true');
    btnDiscard.mousePressed(() => {
      if (!selectedItem || !itemCounts[selectedItem]) return;
      let name = selectedItem;
      let prev = textZone.elt.innerHTML;
      itemCounts[name]--;
      if (itemCounts[name] <= 0) { delete itemCounts[name]; selectedItem = null; }
      showMessage(`「${name}」を捨てました。`, true, () => { showMessage(prev); updateParams(); });
      updateParams();
    });
  }

  // ログ・ロードは戦闘中も表示。セーブは戦闘中非表示
  // 速度設定スライダー
  let speedDiv = createDiv().parent(rightWindow);
  speedDiv.elt.style.cssText = 'margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;';
  let speedLabel = createDiv('速度').parent(speedDiv);
  speedLabel.elt.style.cssText = 'color:var(--text-dim);font-size:clamp(10px,1.3vw,13px);flex:0 0 auto;';
  let slider = createElement('input');
  slider.attribute('type', 'range');
  slider.attribute('min', '0');
  slider.attribute('max', '4');
  slider.attribute('step', '1');
  // 速度値→スライダー値（逆転: 速い=右）
  // _typeSpeed: 0=即時 8=速 18=普通 35=遅 60=最遅
  const speedSteps = [0, 8, 18, 35, 60];
  let curStep = speedSteps.indexOf(_typeSpeed);
  if (curStep === -1) curStep = 2;
  slider.elt.value = 4 - curStep; // 右が速い
  slider.elt.style.cssText = 'flex:1;accent-color:var(--accent);cursor:pointer;';
  slider.parent(speedDiv);
  let speedVal = createDiv(['即時','速','普通','遅','最遅'][curStep]).parent(speedDiv);
  speedVal.elt.style.cssText = 'color:var(--accent);font-size:clamp(10px,1.3vw,13px);flex:0 0 auto;min-width:28px;text-align:right;';
  slider.elt.addEventListener('input', () => {
    let v = 4 - parseInt(slider.elt.value, 10);
    _typeSpeed = speedSteps[v];
    speedVal.elt.textContent = ['即時','速','普通','遅','最遅'][v];
    localStorage.setItem('typeSpeed', String(_typeSpeed));
  });

  let saveDiv = createDiv().id('saveButtons').parent(rightWindow);
  if (!battle.active) {
    createButton('セーブ').parent(saveDiv).mousePressed(() => saveGame());
  }
  createButton('ログ').parent(saveDiv).mousePressed(() => showBacklog());
  let btnLoad = createButton('ロード').parent(saveDiv);
  if (!localStorage.getItem('savedata')) btnLoad.attribute('disabled', 'true');
  btnLoad.mousePressed(() => loadAndRefresh());

  // デバッグ用：全回復ボタン
  if (debugMode) {
    let dbgDiv = createDiv().parent(rightWindow);
    dbgDiv.style('margin-top', '8px');
    dbgDiv.style('border-top', '1px solid #c0503a');
    dbgDiv.style('padding-top', '6px');
    createButton('🔧 全回復').parent(dbgDiv).mousePressed(() => {
      player.hp = MAX_HP;
      player.mp = MAX_MP;
      showMessage('[DEBUG] HP・MP全回復');
      updateParams();
    });
  }
}

// =====================
// アイテム使用
// =====================
function useItem(name) {
  if (!name || !itemCounts[name]) return;

  // 食べ物・回復アイテム
  const foodTable = {
    'りんご':         { hp: 0,      mp: 10 },
    '小果実':         { hp: 0,      mp: 10 },
    'うさぎ肉':       { hp: 0,      mp: 15 },
    '狼の肉':         { hp: 0,      mp: 20 },
    '干し肉':         { hp: 15,     mp: 10 },
    '肉と薬草の包み': { hp: 15,     mp: 15 },
    '薬草スープ':     { hp: 20,     mp: 0  },
    '万能薬':         { hp: MAX_HP, mp: 0  },
    // 焼いたアイテム
    '焼きうさぎ':     { hp: 20,     mp: 20 },
    '焼き狼肉':       { hp: 30,     mp: 25 },
    '焼き果実':       { hp: 5,      mp: 15 },
    '焼きりんご':     { hp: 10,     mp: 15 },
    // 研究所・回復系
    '薬草':           { hp: 5,      mp: 10 },
    '救急キット':     { hp: 25,     mp: 0  },
    '非常食':         { hp: 10,     mp: 10, instant: true }, // 時間消費なし
  };
  if (name in foodTable) {
    let f = foodTable[name];
    player.hp = constrain(player.hp + f.hp, 0, MAX_HP);
    player.mp = constrain(player.mp + f.mp, 0, MAX_MP);
    itemCounts[name]--;
    if (itemCounts[name] <= 0) { delete itemCounts[name]; selectedItem = null; }
    let msg = `「${name}」を使った。`;
    if (f.hp === MAX_HP) msg += `<br>HPが全回復した！`;
    else {
      if (f.hp > 0) msg += `<br>体力 +${f.hp}。`;
      if (f.mp > 0) msg += `<br>気力 +${f.mp}。`;
    }
    if (f.instant) {
      msg += '<br>（時間経過なし）';
      showMessage(msg);
    } else {
      showMessage(msg);
    }
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

  // どこかの鍵：廊下で使うと研究室が開く
  if (name === 'どこかの鍵') {
    if (currentRoom === '廊下') {
      labHasKey = true;
      itemCounts[name]--;
      if (itemCounts[name] <= 0) { delete itemCounts[name]; selectedItem = null; }
      showMessage('廊下の扉の鍵穴に差し込んだ。<br>……カチッと音がした。奥の扉が開いた。<br><span style="color:var(--accent)">（研究室が解放された）</span>');
      updateParams();
    } else {
      let prev = textZone.elt.innerHTML;
      showMessage('鍵穴が合う扉が見当たらない。', true, () => { showMessage(prev); });
    }
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

  let prevCant = textZone.elt.innerHTML;
  showMessage(`「${name}」はここでは使えません。`, true, () => { showMessage(prevCant); });
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

  // 全画面オーバーレイ（containerの直下に固定）
  let overlay = createDiv().id('recipeOverlay').parent(leftTop);

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
    'どこかの鍵': '研究室の扉を開ける鍵。接着剤でカギのかけらを修復して作る。'
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

function showPortrait(who, variant) {
  // who: 'kei' or 'naoto'
  // variant: 'normal'(省略時), 'down', 'happy', 'worry'
  // kei差分: default / serious / impatience
  // naoto差分: normal のみ
  const fileMap = {
    kei: {
      default:    'kei_default.png',
      serious:    'kei_serious.png',
      impatience: 'kei_impatience.png',
    },
    naoto: { normal: 's02.png' },
  };
  let varMap = fileMap[who];
  if (!varMap) return;
  let portraitFile = varMap[variant || 'default'] || varMap[Object.keys(varMap)[0]];
  if (!portraitFile) return;
  let existing = select('#portrait');
  if (existing) existing.remove();
  let img = createImg(portraitFile, who);
  img.id('portrait');
  img.parent(leftTop);  // leftTop内に配置
  img.style('position', 'absolute');
  img.style('bottom', '0');        // 下隙間なし
  img.style('left', '50%');        // 中央寄せ
  img.style('transform', 'translateX(-50%)'); // 中央揃え
  img.style('height', '95%');      // leftTopの高さいっぱい
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