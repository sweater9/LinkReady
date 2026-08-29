const CACHE='linkready-v8';
const ASSETS=['./','./index.html','./styles.css','./cleaner.js','./app.js','./manifest.webmanifest','./icon.svg','./apple-touch-icon.png','./og.png','./vendor/qrcode.min.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(caches.match('./index.html').then(cached=>cached||fetch(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}
    return response;
  })));
});
