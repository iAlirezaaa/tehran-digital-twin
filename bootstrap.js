/* Tehran Atlas: resilient loading and interactive fallback without third-party JS. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const locations = [
    ['میدان آزادی',51.3380,35.6995], ['ستارخان',51.359,35.715],
    ['تجریش',51.427,35.805], ['میدان ونک',51.410,35.758],
    ['بازار تهران',51.422,35.675], ['برج میلاد',51.375,35.745],
    ['تهرانپارس',51.527,35.732], ['نیاوران',51.466,35.813]
  ];
  const bounds = [50.94,35.47,51.73,35.91];
  let ready = false, fallback = false, current = bounds;
  const bbox = b => b.map(n => Number(n).toFixed(5)).join(',');
  const osmEmbed = b => 'https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox(b)) + '&layer=mapnik';
  const osmLink = b => 'https://www.openstreetmap.org/#map=11/35.6892/51.3890';
  const around = (lon,lat) => [lon-.011,lat-.0075,lon+.011,lat+.0075];

  function useFallback(reason) {
    if (ready || fallback) return;
    fallback = true;
    document.body.classList.add('tehran-basic-mode');
    const host = $('map');
    if (!host) return;
    const frame = document.createElement('iframe');
    frame.title = 'نقشهٔ قابل پیمایش تهران — OpenStreetMap';
    frame.setAttribute('loading', 'eager');
    frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    frame.style.cssText = 'border:0;width:100%;height:100%;display:block;background:#dce5e7';
    host.replaceChildren(frame);
    const status = $('loading');
    if (status) {
      status.classList.add('hidden');
      status.setAttribute('aria-hidden','true');
    }
    const notice = document.createElement('div');
    notice.className = 'tehran-basic-notice';
    const text = document.createElement('span');
    text.textContent = 'نمای پایهٔ تهران فعال شد؛ ' + (reason || 'نمایش سه‌بعدی فعلاً در دسترس نیست.');
    const link = document.createElement('a');
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = 'مشاهده در OpenStreetMap ↗';
    notice.append(text,link);
    host.after(notice);
    function fly(b) {
      current = b;
      frame.src = osmEmbed(b);
      link.href = osmLink(b);
      $('scale-label').textContent = 'نمای پایه';
      $('zoom-value').textContent = 'پایه';
      $('visible-value').textContent = '—';
      $('view-value').textContent = 'نقشهٔ دوبعدی';
      $('coords').textContent = ((b[1]+b[3])/2).toFixed(5) + '° N · ' + ((b[0]+b[2])/2).toFixed(5) + '° E';
    }
    fly(bounds);
    const grid = $('place-grid');
    if (grid) {
      grid.replaceChildren();
      locations.forEach(([name,lon,lat]) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'place';
        button.textContent = name;
        button.addEventListener('click', () => {
          grid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          button.classList.add('active');
          fly(around(lon,lat));
          $('sidebar').classList.remove('open');
        });
        grid.append(button);
      });
    }
    ['toggle-buildings','toggle-dark','toggle-terrain'].forEach(id => {
      const input = $(id);
      if (input) {input.checked=false;input.disabled=true;input.title='در نمای پایه در دسترس نیست';}
    });
    $('home-btn')?.addEventListener('click', e => {e.stopImmediatePropagation();fly(bounds);}, true);
    $('share-btn')?.addEventListener('click', e => {
      e.stopImmediatePropagation();
      const url='https://www.openstreetmap.org/#map=11/35.6892/51.3890';
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).catch(()=>window.prompt('لینک نقشه',url));
      else window.prompt('لینک نقشه',url);
    },true);
    $('search-form')?.addEventListener('submit',e => {
      e.preventDefault();e.stopImmediatePropagation();
      const q=$('search-input').value.trim();
      if (!q) { $('search-status').textContent='نام مکان را وارد کنید.'; return; }
      window.open('https://www.openstreetmap.org/search?query='+encodeURIComponent(q+' تهران'),'_blank','noopener');
      $('search-status').textContent='جست‌وجو در نقشهٔ اصلی باز شد.';
    },true);
    $('sidebar-toggle')?.addEventListener('click',e => {
      e.stopImmediatePropagation();
      const side=$('sidebar'), isOpen=side.classList.toggle('open');
      e.currentTarget.setAttribute('aria-expanded',String(isOpen));
    },true);
    console.warn('Tehran Atlas switched to basic map:',reason);
  }
  const style=document.createElement('style');
  style.textContent='.tehran-basic-notice{position:absolute;z-index:3;top:77px;left:15px;right:15px;max-width:510px;box-shadow:0 4px 20px #0013;background:#fff;border:1px solid #d2dcdf;border-radius:12px;padding:10px 12px;color:#243947;font-size:12px;display:flex;gap:10px;align-items:center;justify-content:space-between;line-height:1.7}.tehran-basic-notice a{white-space:nowrap;color:#0b7260;text-decoration:underline}@media(max-width:700px){.tehran-basic-notice{top:110px;flex-wrap:wrap;max-width:calc(100% - 30px)}}';
  document.head.appendChild(style);
  const watchdog = setTimeout(() => useFallback('زمان بارگذاری سرویس نقشه طولانی شد.'), 14000);
  window.tehranAtlasReady = () => {
    if (fallback) return;
    ready = true; clearTimeout(watchdog);
  };
  window.tehranAtlasFallback = reason => {
    clearTimeout(watchdog); useFallback(reason);
  };
  window.addEventListener('unhandledrejection',event => {
    if (!ready && !fallback && /maplibre|tile|fetch|import|worker|webgl|module/i.test(String(event.reason))) {
      useFallback('یک سرویس نقشه یا کتابخانه بارگذاری نشد.');
    }
  });
  import('./app.js?v=0.2.1').catch(err => {
    console.error('Tehran atlas module failed:',err);
    useFallback('بارگذاری موتور سه‌بعدی ناموفق بود.');
  });
})();
