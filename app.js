const maplibregl = await import('https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl.mjs')
  .catch(async () => import('https://cdn.jsdelivr.net/npm/maplibre-gl@6.17.0/dist/maplibre-gl.mjs'));

const CENTER = [51.359, 35.715]; // Sattarkhan: default detailed 3D start; citywide via Home.
// Navigation framing, not a legal/municipal boundary.
const TEHRAN_VIEW = [[50.94, 35.47], [51.73, 35.91]];
const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/dark'
};
const BUILDING_SOURCE = 'tehran-building-vector';
const BUILDING_LAYER = 'tehran-buildings-3d';
const TERRAIN_SOURCE = 'tehran-elevation-dem';
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const PLACES = [
  {name:'میدان آزادی', center:[51.3380,35.6995], zoom:16.2},
  {name:'ستارخان', center:[51.359,35.715], zoom:16.4},
  {name:'تجریش', center:[51.427,35.805], zoom:16.3},
  {name:'میدان ونک', center:[51.410,35.758], zoom:16.2},
  {name:'بازار تهران', center:[51.422,35.675], zoom:16.1},
  {name:'برج میلاد', center:[51.375,35.745], zoom:16.1},
  {name:'تهرانپارس', center:[51.527,35.732], zoom:16.1},
  {name:'نیاوران', center:[51.466,35.813], zoom:16.2}
];
const el = id => document.getElementById(id);
const isReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saved = (() => { try { return JSON.parse(localStorage.getItem('tehran-map-preferences') || '{}'); } catch { return {}; } })();
const settings = {buildings:saved.buildings !== false, terrain:!!saved.terrain, dark:!!saved.dark};
for (const name of ['buildings','terrain','dark']) el(`toggle-${name}`).checked = settings[name];
const params = new URLSearchParams(location.hash.slice(1));
const parseNum = (s, lo, hi, fallback) => { const n=Number(s); return Number.isFinite(n) && n>=lo && n<=hi ? n : fallback; };
const urlCenter = [parseNum(params.get('lng'),50,53,CENTER[0]),parseNum(params.get('lat'),35,37,CENTER[1])];
const initialZoom = parseNum(params.get('z'),8,19,16.1);
const initialPitch = parseNum(params.get('pitch'),0,75,62);

if (!maplibregl.supported()) {
  el('loading').innerHTML = 'مرورگر از WebGL لازم برای نمایش نقشه پشتیبانی نمی‌کند.';
  throw new Error('WebGL is not supported');
}
const map = new maplibregl.Map({
  container:'map',
  style: STYLES[settings.dark ? 'dark':'light'],
  center:urlCenter,
  zoom:initialZoom,
  pitch:initialPitch,
  bearing:parseNum(params.get('bearing'),-180,180,-17),
  minZoom:9,
  maxZoom:19,
  maxPitch:75,
  attributionControl:false,
  canvasContextAttributes:{antialias:true},
  cooperativeGestures:false
});
window.tehranMap=map;
map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
map.addControl(new maplibregl.FullscreenControl(),'top-right');
map.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'Map tiles © OpenFreeMap · Terrain: Mapzen/AWS Open Data'}),'bottom-right');

function persist(){ try{localStorage.setItem('tehran-map-preferences', JSON.stringify(settings));}catch{} }
let toastTimer;
function toast(message){const box=el('toast');box.textContent=message;box.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('show'),3500);}
function addBuildings() {
  if(!map.getSource(BUILDING_SOURCE)) map.addSource(BUILDING_SOURCE,{type:'vector',url:'https://tiles.openfreemap.org/planet'});
  if(map.getLayer(BUILDING_LAYER)) return;
  const layers=map.getStyle().layers || [];
  const firstLabel=layers.find(l=>l.type==='symbol' && l.layout && l.layout['text-field']);
  map.addLayer({
    id: BUILDING_LAYER,
    type:'fill-extrusion',
    source:BUILDING_SOURCE,
    'source-layer':'building',
    minzoom:15,
    filter:['!=',['get','hide_3d'],true],
    layout:{visibility:settings.buildings?'visible':'none'},
    paint:{
      'fill-extrusion-color':settings.dark?'#8daebf':'#b9bbb8',
      'fill-extrusion-opacity':0.86,
      'fill-extrusion-height':['interpolate',['linear'],['zoom'],15,0,15.3,['case',['>', ['to-number',['get','render_height'],0],0],['to-number',['get','render_height']],9]],
      'fill-extrusion-base':['interpolate',['linear'],['zoom'],15,0,15.3,['coalesce',['to-number',['get','render_min_height']],0]]
    }
  },firstLabel?.id);
}
function setupTerrain(){
  if(!map.getSource(TERRAIN_SOURCE)) {
    map.addSource(TERRAIN_SOURCE,{type:'raster-dem',tiles:[TERRAIN_TILES],tileSize:256,encoding:'terrarium',maxzoom:14,attribution:'Elevation © Mapzen and data contributors'});
  }
  // Terrain can be expensive to render. It is opt-in and can be disabled at any time.
  map.setTerrain(settings.terrain ? {source:TERRAIN_SOURCE,exaggeration:1}:null);
}
function setupStyle(){
  try{addBuildings();setupTerrain();updateStats();}catch(err){console.error('Layer initialization failed',err);toast('بارگذاری یکی از لایه‌ها انجام نشد. دوباره تلاش کنید.');}
}
map.on('style.load',setupStyle);
map.on('load',()=>{el('loading').classList.add('hidden');updateStats();window.tehranAtlasReady?.();window.dispatchEvent(new Event('tehran:ready'));});
let initialMapErrors = 0;
map.on('error',e=>{
  console.warn('Map layer error:',e.error || e);
  if(!map.loaded()) {
    const span=el('loading')?.querySelector('span');
    if(span) span.textContent='برقراری ارتباط با داده‌های نقشه…';
    if(++initialMapErrors >= 4) window.tehranAtlasFallback?.('دریافت نقشهٔ سه‌بعدی از سرویس اصلی ناموفق بود.');
  }
});
function setLayer(name,enabled){
  settings[name]=enabled;persist();
  if(name==='dark'){map.setStyle(STYLES[settings.dark?'dark':'light']);}
  if(name==='buildings' && map.getLayer(BUILDING_LAYER))map.setLayoutProperty(BUILDING_LAYER,'visibility',enabled?'visible':'none');
  if(name==='terrain' && map.isStyleLoaded())try{setupTerrain();}catch(err){console.warn(err);toast('لایه ارتفاعی فعلاً در دسترس نیست.');}
  updateStats();
}
for(const name of ['dark','terrain','buildings'])el(`toggle-${name}`).addEventListener('change',e=>setLayer(name,e.target.checked));
const grid=el('place-grid');
for(const place of PLACES){
  const b=document.createElement('button');b.type='button';b.className='place';b.innerHTML=`<span>${place.name}</span><span class="place-arrow" aria-hidden="true">↗</span>`;
  b.addEventListener('click',()=>{grid.querySelectorAll('.place').forEach(v=>v.classList.remove('active'));b.classList.add('active');goTo(place.center,place.zoom);closeSidebarMobile();});
  grid.append(b);
}
function goTo(center,zoom=16.3){map.flyTo({center,zoom,pitch:58,bearing:-10,speed:1.0,duration:isReducedMotion?0:undefined});}
el('home-btn').addEventListener('click',()=>map.fitBounds(TEHRAN_VIEW,{padding:60,pitch:25,bearing:0,duration:isReducedMotion?0:1300}));
const sidebar=el('sidebar');const sidebarButton=el('sidebar-toggle');
sidebarButton.addEventListener('click',()=>{let open=sidebar.classList.toggle('open');sidebarButton.setAttribute('aria-expanded',String(open));sidebarButton.querySelector('span').textContent=open?'⌄':'⌃';setTimeout(()=>map.resize(),300);});
function closeSidebarMobile(){if(innerWidth<701){sidebar.classList.remove('open');sidebarButton.setAttribute('aria-expanded','false');setTimeout(()=>map.resize(),300);}}
let lastSearchAt=0;
el('search-form').addEventListener('submit',async e=>{
  e.preventDefault();const q=el('search-input').value.trim();if(q.length<2){el('search-status').textContent='نام مکان را وارد کنید.';return;}
  const status=el('search-status');const now=Date.now();if(now-lastSearchAt<1500){status.textContent='برای جست‌وجوی بعدی کمی فاصله بگذارید.';return;}
  lastSearchAt=now;status.textContent='در حال جست‌وجو…';
  try{
    // Single submit only, no autocomplete; respectful of public Nominatim limits.
    const query=new URLSearchParams({q:`${q}، تهران، ایران`,format:'jsonv2',limit:'5',countrycodes:'ir',viewbox:'50.90,35.95,51.75,35.45',bounded:'1',accept_language:'fa'});
    const response=await fetch(`https://nominatim.openstreetmap.org/search?${query}`);
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const places=await response.json();
    const found=places.find(p=>Number.isFinite(+p.lon) && Number.isFinite(+p.lat));
    if(!found){status.textContent='موردی در محدوده جست‌وجوی تهران پیدا نشد.';return;}
    status.textContent=found.display_name?.split(',').slice(0,2).join('، ')||'مکان پیدا شد';goTo([+found.lon,+found.lat],16);closeSidebarMobile();
  }catch(err){console.warn(err);status.textContent='جست‌وجو در دسترس نیست. از مکان‌های سریع استفاده کنید.';}
});
function updateStats(){
  if(!map) return;
  const zoom=map.getZoom();el('zoom-value').textContent=zoom.toFixed(1);
  el('scale-label').textContent=zoom<13?'نمای سراسری':zoom<15?'بافت شهری':'جزئیات ساختمان';
  el('view-value').textContent=settings.terrain?'زمین 3D':settings.buildings?'ساختمان 3D':'نقشه 2D';
  const c=map.getCenter();el('coords').textContent=`${c.lat.toFixed(5)}° N · ${c.lng.toFixed(5)}° E`;
  if(!settings.buildings||zoom<15||!map.getLayer(BUILDING_LAYER)){el('visible-value').textContent='—';return;}
  try{const f=map.queryRenderedFeatures({layers:[BUILDING_LAYER]});el('visible-value').textContent=new Intl.NumberFormat('fa-IR').format(f.length);}catch{el('visible-value').textContent='—';}
}
map.on('moveend',updateStats);
map.on('zoomend',updateStats);
const formatMeters=n=>Number.isFinite(n)?`${new Intl.NumberFormat('fa-IR',{maximumFractionDigits:1}).format(n)} متر`:'ثبت نشده';
map.on('click',e=>{
  if(!settings.buildings || map.getZoom()<15 || !map.getLayer(BUILDING_LAYER)) return;
  const feature=map.queryRenderedFeatures(e.point,{layers:[BUILDING_LAYER]})[0];if(!feature)return;
  const p=feature.properties||{};
  const rawHeight=Number(p.render_height);const height=Number.isFinite(rawHeight)&&rawHeight>0?formatMeters(rawHeight):'نامشخص (حجم نمایشی)';
  const root=document.createElement('div');root.className='building-popup';
  const heading=document.createElement('strong');heading.textContent='عوارض ساختمانی';root.append(heading);
  const hint=document.createElement('small');hint.textContent='برگرفته از دادهٔ نقشه؛ دقت نیازمند بررسی است';root.append(hint);
  for (const [name,value] of [['ارتفاع در دادهٔ رندر',height],['کاربری / نوع',p.class||p.type||'نامشخص'],['شناسه',feature.id??'ثبت نشده']]){
    const row=document.createElement('div');row.className='data-pair';const label=document.createElement('span');label.textContent=name;const val=document.createElement('b');val.textContent=String(value);row.append(label,val);root.append(row);
  }
  new maplibregl.Popup({closeButton:true,maxWidth:'260px'}).setLngLat(e.lngLat).setDOMContent(root).addTo(map);
});
map.on('mousemove',e=>{
  if(!map.getLayer(BUILDING_LAYER) || !settings.buildings || map.getZoom()<15)return;
  map.getCanvas().style.cursor=map.queryRenderedFeatures(e.point,{layers:[BUILDING_LAYER]}).length?'pointer':'';
});
function shareUrl(){const c=map.getCenter();const p=new URLSearchParams({lat:c.lat.toFixed(5),lng:c.lng.toFixed(5),z:map.getZoom().toFixed(2),pitch:map.getPitch().toFixed(0),bearing:map.getBearing().toFixed(0)});return `${location.origin}${location.pathname}#${p}`;}
el('share-btn').addEventListener('click',async()=>{
  const url=shareUrl();try{await navigator.clipboard.writeText(url);toast('لینک نمای فعلی کپی شد.');}catch{window.prompt('لینک نمای فعلی',url);}
});
// Discoverable URL for the code after the repository is published.
const repoUrl='https://github.com/iAlirezaaa/tehran-digital-twin';el('source-link').href=repoUrl;
