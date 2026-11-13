/* 倚盟工具箱 — 推播 Service Worker（進貨單、耗材、到貨貼標、總部公告共用）
   放在 /telecom-invoice/firebase-messaging-sw.js（路徑不要改，各系統都指向這裡）
   2026-11-13：加「圖示紅色數字」、點通知依內容開對的頁面 */

/* ── 圖示紅色數字：每收到一則 +1（打開工具箱時由網頁清成 0） ── */
function badgeBump(){
  return new Promise(function(res){
    try{
      var r=indexedDB.open('emo-push',1);
      r.onupgradeneeded=function(){r.result.createObjectStore('kv');};
      r.onsuccess=function(){
        var db=r.result,tx=db.transaction('kv','readwrite'),s=tx.objectStore('kv'),g=s.get('badge'),n=1;
        g.onsuccess=function(){n=(Number(g.result)||0)+1;s.put(n,'badge');};
        tx.oncomplete=function(){db.close();
          try{if(self.navigator&&self.navigator.setAppBadge){self.navigator.setAppBadge(n).then(res,res);return;}}catch(e){}
          res();};
        tx.onerror=function(){db.close();res();};
      };
      r.onerror=function(){res();};
    }catch(e){res();}
  });
}
/* 要寫在 Firebase 前面，才會先收到 */
self.addEventListener('push',function(event){ event.waitUntil(badgeBump()); });

/* ── 點通知：依標題開對應的頁面 ── */
function targetUrl(title){
  title=String(title||'');
  if(/耗材/.test(title))return '/supply/';
  if(/標籤|到貨/.test(title))return '/barcode/';
  if(/公告|📢/.test(title))return '/';
  return '/telecom-invoice/';
}
self.addEventListener('notificationclick',function(event){
  event.notification.close();
  var url=targetUrl(event.notification.title);
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
      for(var i=0;i<list.length;i++){
        var p=new URL(list[i].url).pathname;
        if((url==='/'?p==='/'||p==='/index.html':p.indexOf(url)===0)&&'focus' in list[i])return list[i].focus();
      }
      if(clients.openWindow)return clients.openWindow(url);
    })
  );
});

importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCAPljha2I7qqFU49GV2UJC2F64HoKRqnc",
  authDomain: "telecom-invoice.firebaseapp.com",
  projectId: "telecom-invoice",
  storageBucket: "telecom-invoice.firebasestorage.app",
  messagingSenderId: "97406219385",
  appId: "1:97406219385:web:bff8bbceba3d36536810a8"
});

/* 初始化 messaging：SDK 會自動顯示背景通知 */
firebase.messaging();
