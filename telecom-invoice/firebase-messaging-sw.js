/* 倚盟進貨單管理 — 推播 Service Worker
   讓網頁在背景（沒開著）時也能收到通知。此檔需放在網站根目錄。 */
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

// 初始化 messaging：SDK 會自動處理背景通知的顯示
firebase.messaging();

// 點擊通知 → 打開系統頁面（若已開著就聚焦）
self.addEventListener('notificationclick', function(event){
  event.notification.close();
  const url = '/telecom-invoice/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      for (var i=0;i<list.length;i++){
        if (list[i].url.indexOf('/telecom-invoice/') !== -1 && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
