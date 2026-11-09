/* Tehran Digital Twin: viewport and selected-place GIS explorer.
   Uses only the same OSM vector tiles that are already streamed to the map. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const html = s => { const n=document.createElement('span');n.textContent=String(s);return n; };
const fa = n => new Intl.NumberFormat('fa-IR').format(n);
const groups = [
  ['آموزشی',/school|college|university|kindergarten|library|education/i],
  ['درمانی',/hospital|clinic|pharmacy|doctors|dentist|health/i],
  ['خرید و بازار',/shop|supermarket|mall|market|convenience|retail|department_store/i],
  ['حمل‌ونقل',/station|bus|subway|railway|transport|parking|fuel|taxi/i],
  ['پارک و ورزش',/park|garden|sports|stadium|pitch|fitness|recreation|playground/i],
  ['فرهنگی و گردشگری',/museum|cinema|theatre|arts|attraction|monument|historic|tourism/i],
  ['خدمات عمومی',/police|fire_station|post|bank|atm|government|townhall|public/i],
  ['رستوران و کافه',/restaurant|cafe|fast_food|food|bar|pub/i]
];
const nameOf = p => p['name:fa'] || p.name_fa || p.name || p.name_en || null;
const categoryOf = p => {
  const x = [p.class,p.subclass,p.type,p.amenity,p.shop,p.leisure,p.tourism,p.landuse,p.place].filter(Boolean).join(' ');
  return (groups.find(([name,re])=>re.test(x))||['سایر مکان‌ها'])[0];
};
const description = p => [p.class,p.subclass,p.type,p.amenity,p.shop,p.landuse].filter(Boolean).join(' / ')||'جزئیات ثبت نشده';
const geomCenter = g => {
  if (!g) return null;
  if(g.type==='Point')return g.coordinates;
  let pts=[];
  const dig = c => { if (!Array.isArray(c)) return; if (typeof c[0] === 'number' && typeof c[1] === 'number') pts.push(c); else c.forEach(dig); };
  dig(g.coordinates);
  if (!pts.length) return null;
  return [pts.reduce((s,x)=>s+x[0],0)/pts.length,pts.reduce((s,x)=>s+x[1],0)/pts.length];
};
const inside = (pt,b) => pt && pt[0]>=b.getWest() && pt[0]<=b.getEast() && pt[1]>=b.getSouth() && pt[1]<=b.getNorth();
function unique(features) {
  const found=new Set(),result=[];
  for(const f of features){
    const p=f.properties||{},pt=geomCenter(f.geometry);
    const key=[f.id||'',nameOf(p)||'',p.class||'',p.subclass||'',pt?.map(n=>n.toFixed(5)).join(',')||''].join('|');
    if(found.has(key))continue;
    found.add(key);result.push(f);
  }
  return result;
}
let map, mapping, updateToken;
function card(k,v,extra) {
  const d=document.createElement('div');d.className='area-stat';
  const strong=document.createElement('strong');strong.textContent=String(v);d.append(strong);
  const label=document.createElement('span');label.textContent=k;d.append(label);
  if(extra)d.title=extra;
  return d;
}
function clear(node){if(node)node.replaceChildren();}
function status(message){const n=$('area-status');if(n)n.textContent=message;}
function getFeatures(layer) {
  try {
    if(!map.getSource('tehran-building-vector')) return [];
    return unique(map.querySourceFeatures('tehran-building-vector',{sourceLayer:layer})||[]);
  } catch(error) {console.warn('OSM layer unavailable:',layer,error);return [];}
}
function draw() {
  if(!map || !map.isStyleLoaded?.())return;
  const z=map.getZoom(),b=map.getBounds(),stats=$('area-stats'),places=$('area-places'),uses=$('area-uses');
  if(!stats||!places||!uses)return;
  clear(stats);clear(places);clear(uses);
  const location=map.getCenter();
  $('area-coordinates').textContent=location.lat.toFixed(4)+'° N · '+location.lng.toFixed(4)+'° E';
  if(z<14){
    status('برای نمایش کاربری‌ها و جزئیات ساختمان‌ها، تا بزرگ‌نمایی ۱۴ یا بیشتر نزدیک شوید.');
    stats.append(card('بزرگ‌نمایی',z.toFixed(1)));
    return;
  }
  const building=getFeatures('building').filter(f=> {
    const pt=geomCenter(f.geometry);return inside(pt,b);
  });
  const pois=getFeatures('poi').filter(f=>inside(geomCenter(f.geometry),b));
  const landuse=getFeatures('landuse').filter(f=>inside(geomCenter(f.geometry),b));
  const placesL=getFeatures('place').filter(f=>inside(geomCenter(f.geometry),b));
  const labeled=pois.filter(f=>nameOf(f.properties||{}));
  const cats={};
  for (const f of pois){const cat=categoryOf(f.properties||{});cats[cat]=(cats[cat]||0)+1;}
  // Land-use polygons are not POIs: report them separately and do not confuse
  // polygon counts with measured land area or the number of institutions.
  const landLabels = {
    residential:'بافت مسکونی',commercial:'کاربری تجاری',industrial:'کاربری صنعتی',
    retail:'خرده‌فروشی',school:'محدودهٔ آموزشی',university:'محدودهٔ دانشگاهی',
    hospital:'محدودهٔ درمانی',railway:'راه‌آهن',parking:'پارکینگ',
    cemetery:'آرامستان',military:'نظامی',garages:'گاراژ',stadium:'ورزشگاه',
    playground:'زمین بازی',park:'فضای سبز'
  };
  const usesCount={};
  for(const f of landuse){
    const p=f.properties||{},raw=p.class||p.type;
    if(!raw)continue;
    const name=landLabels[raw]||raw;
    usesCount[name]=(usesCount[name]||0)+1;
  }
  stats.append(card('ساختمان‌های شناسایی‌شده در کاشی‌های نما',fa(building.length),'شمار تقریبی؛ کاشی‌های همپوشان و هندسه‌های چندبخشی ممکن است خطا ایجاد کنند'));
  stats.append(card('مکان‌های ثبت‌شده',fa(pois.length)));
  stats.append(card('نام‌های مکان',fa(labeled.length)));
  const useTypes = Object.entries(usesCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(useTypes.length){
    const label=document.createElement('small');
    label.className='area-landuse-caption';
    label.textContent='کاربری‌های سطح زمین (تعداد عوارض، نه مساحت):';
    uses.append(label);
    for(const [name,count] of useTypes) {
      const item=document.createElement('div');item.className='area-use';
      item.append(html(name));
      const countLabel=html(fa(count));countLabel.className='area-use-count';item.append(countLabel);
      uses.append(item);
    }
    const label2=document.createElement('small');label2.className='area-landuse-caption';label2.textContent='خدمات و مکان‌های نقطه‌ای:';
    uses.append(label2);
  }
  const order=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  if(!order.length) {
    uses.append(html('در این بزرگ‌نمایی، دسته‌بندی نقطه‌ای قابل گزارش یافت نشد. برای اطلاعات بیشتر نزدیک شوید.'));
  } else for(const [category,count] of order.slice(0,8)){
    const item=document.createElement('div');item.className='area-use';
    const title=html(category);const val=html(fa(count));val.className='area-use-count';
    item.append(title,val);uses.append(item);
  }
  // Source tiles may include neighboring buffered geometry; results are indicative.
  const known=new Set(); let shown=0;
  for(const f of [...labeled,...placesL.filter(f=>nameOf(f.properties||{}))]){
    const p=f.properties||{},title=nameOf(p),pt=geomCenter(f.geometry);
    if(!title||!inside(pt,b)||known.has(title+'|'+pt.join(',')))continue;
    known.add(title+'|'+pt.join(','));
    const button=document.createElement('button');button.type='button';button.className='area-place';
    const name=document.createElement('b');name.textContent=title;
    const type=document.createElement('small');type.textContent=categoryOf(p)+' · '+description(p);
    button.append(name,type);
    button.addEventListener('click',()=>map.flyTo({center:pt,zoom:Math.max(16,map.getZoom()),pitch:62,bearing:-14,duration:750}));
    places.append(button);
    if(++shown>=12)break;
  }
  if(!shown)places.append(html('مکان دارای نام در داده‌های این نمای نقشه ثبت نشده است.'));
  const approx = building.length + pois.length + landuse.length;
  status(approx ? 'آمار تقریبیِ داده‌های OSM که در این لحظه در کاشی‌های نقشه بارگذاری شده‌اند؛ نه فهرست کامل یا آمار رسمی محدوده.' :
    'اطلاعات مکانی بارگذاری نشده است. اتصال نقشه را بررسی کنید یا کمی بزرگ‌نمایی کنید.');
}
function schedule(){if(updateToken)clearTimeout(updateToken);updateToken=setTimeout(draw,300);}
function init(){
  if(mapping)return;
  if(!window.tehranMap)return;
  map=window.tehranMap;mapping=true;
  $('area-refresh')?.addEventListener('click',draw);
  map.on('moveend',schedule);
  map.on('idle',schedule);
  map.on('style.load',schedule);
  const btn=$('three-d-btn');
  btn?.addEventListener('click',()=>{
    const center=map.getCenter();
    const target=map.getZoom()<15.2 ? 16 : map.getZoom();
    const checkbox=$('toggle-buildings');
    if(checkbox&&!checkbox.checked){checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));}
    map.easeTo({center,zoom:target,pitch:65,bearing:-18,duration:950});
  });
  map.on('click',e=>{
    // Explicit point details in the area panel; preserve original building popup.
    const target=$('area-picked');if(!target)return;
    let features=[];
    try{ features=map.queryRenderedFeatures(e.point)||[]; }catch{}
    const matched=features.find(f=>{
      const p=f.properties||{};
      return nameOf(p)||p.class||p.amenity||p.landuse||p.building;
    });
    if(!matched) {
      target.textContent='نقطه انتخاب شد؛ اطلاعات ثبت‌شده‌ای برای آن پیدا نشد.';
      return;
    }
    const p=matched.properties||{};
    const label=nameOf(p)||'عارضهٔ بدون نام';
    const type=description(p);
    target.textContent=label+' — '+type+' (منبع: OpenStreetMap)';
  });
  schedule();
}
window.addEventListener('tehran:ready',init);
if(window.tehranMap && window.tehranMap.loaded?.())init();
})();
