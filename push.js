/* 倚盟工具箱 — 共用推播（首頁、到貨貼標用）
   放在網站根目錄：/push.js
   · 跟進貨單、耗材用同一套：Firebase 專案 telecom-invoice、pushTokens 集合、Apps Script 代發
   · 背景程式沿用 /telecom-invoice/firebase-messaging-sw.js（同一支手機只會有一個登記，不會重複收）
   · 圖示上的紅色數字：背景程式每收到一則就 +1，打開工具箱就清掉 */
(function(){
  var CFG={apiKey:'AIzaSyCAPljha2I7qqFU49GV2UJC2F64HoKRqnc',authDomain:'telecom-invoice.firebaseapp.com',projectId:'telecom-invoice',storageBucket:'telecom-invoice.firebasestorage.app',messagingSenderId:'97406219385',appId:'1:97406219385:web:bff8bbceba3d36536810a8'};
  var VAPID='BAkPwW4LgB7f0CFmOr2HX2IOCuI89772gDpniRFBKZNcgXuY5-0CozJg7OC5ux7EhCmYadQY9ZrU8XyIZ_0Hh2E';
  var RELAY='https://script.google.com/macros/s/AKfycbxOfnIJOxzCE5SlfZYIpK614PUNntIVrucRS2qAx3pz_O08ptpzUGskgGun-lJcTRB2/exec';
  var SW_PATH='/telecom-invoice/firebase-messaging-sw.js', SW_SCOPE='/telecom-invoice/';
  var G='https://www.gstatic.com/firebasejs/12.16.0/';
  var _fb=null;
  function fb(){
    if(_fb)return _fb;
    _fb=Promise.all([import(G+'firebase-app.js'),import(G+'firebase-firestore.js')]).then(function(m){
      var A=m[0],F=m[1];
      var app=A.getApps().find(function(x){return x.name==='push';})||A.initializeApp(CFG,'push');
      return {A:A,F:F,app:app,db:F.getFirestore(app)};
    });
    _fb.catch(function(){_fb=null;});
    return _fb;
  }
  function isIOS(){return /iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
  function standalone(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;}

  /* 這台裝置的通知狀態：granted／default（還沒問）／denied（被拒）／ios-browser（iPhone 用 Safari 開，要改用主畫面圖示）／unsupported／off */
  function state(){
    if(location.protocol!=='https:')return 'off';
    if(!('serviceWorker' in navigator)||!('Notification' in window))return (isIOS()&&!standalone())?'ios-browser':'unsupported';
    return Notification.permission;
  }

  /* ── 圖示紅色數字（數字存在 IndexedDB，背景程式也讀同一個） ── */
  function idb(fn){
    return new Promise(function(res){
      try{var r=indexedDB.open('emo-push',1);
        r.onupgradeneeded=function(){r.result.createObjectStore('kv');};
        r.onsuccess=function(){var db=r.result,tx=db.transaction('kv','readwrite');fn(tx.objectStore('kv'));tx.oncomplete=function(){db.close();res();};tx.onerror=function(){db.close();res();};};
        r.onerror=function(){res();};
      }catch(e){res();}
    });
  }
  function clearBadge(){
    try{if(navigator.clearAppBadge)navigator.clearAppBadge().catch(function(){});}catch(e){}
    return idb(function(s){s.put(0,'badge');});
  }

  function swActive(reg){
    if(reg.active)return Promise.resolve(reg);
    var w=reg.installing||reg.waiting;
    return new Promise(function(res){
      if(!w){res(reg);return;}
      w.addEventListener('statechange',function(){if(w.state==='activated')res(reg);});
      setTimeout(function(){res(reg);},8000);
    });
  }

  /* 登記這台裝置：owner＝店名（例「鼎山店」）或 'admin'。ask=true 才會跳出系統詢問（iPhone 規定要使用者親手點） */
  async function register(owner,ask){
    var st=state();
    if(!owner||st==='off'||st==='unsupported'||st==='ios-browser'||st==='denied')return st;
    if(st==='default'){
      if(!ask)return st;
      st=await Notification.requestPermission();
      if(st!=='granted')return st;
    }
    try{
      var M=await import(G+'firebase-messaging.js');
      if(!(await M.isSupported()))return 'unsupported';
      var f=await fb();
      var reg=await swActive(await navigator.serviceWorker.register(SW_PATH,{scope:SW_SCOPE}));
      var token=await M.getToken(M.getMessaging(f.app),{vapidKey:VAPID,serviceWorkerRegistration:reg});
      if(!token)return 'error';
      var F=f.F,col=F.collection(f.db,'pushTokens');
      var snap=await F.getDocs(F.query(col,F.where('token','==',token)));
      if(snap.empty)await F.addDoc(col,{owner:owner,token:token,ua:navigator.userAgent,src:'hub',updatedAt:F.serverTimestamp()});
      else await F.updateDoc(F.doc(f.db,'pushTokens',snap.docs[0].id),{owner:owner,updatedAt:F.serverTimestamp()});
      return 'granted';
    }catch(e){console.warn('推播登記失敗',e);return 'error';}
  }

  /* 發通知：owners＝店名或 'admin'，可以是陣列。回傳送出的手機數 */
  async function send(owners,title,body){
    try{
      owners=[].concat(owners).filter(Boolean);
      if(!owners.length)return 0;
      var f=await fb(),F=f.F;
      var snap=await F.getDocs(F.query(F.collection(f.db,'pushTokens'),F.where('owner','in',owners.slice(0,30))));
      var tokens=[...new Set(snap.docs.map(function(d){return d.data().token;}).filter(Boolean))];
      if(!tokens.length){console.log('沒有登記的手機：'+owners.join('、'));return 0;}
      await fetch(RELAY,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({tokens:tokens,title:title,body:body})});
      return tokens.length;
    }catch(e){console.warn('發通知失敗',e);return -1;}
  }

  window.EMOPUSH={state:state,register:register,send:send,clearBadge:clearBadge,isIOS:isIOS,standalone:standalone};
  /* 打開工具箱任何一頁就清掉圖示上的數字 */
  if(location.protocol==='https:'){
    clearBadge();
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')clearBadge();});
  }
})();
