/* Pure helpers shared by admin.html, tracker.html and shop.html. No imports, no DOM. */

export const SITE_URL = 'https://struckduck.github.io/Booking13/';
export const STATUSES = ['Not contacted', 'Contacted', 'Followed up', 'Booked', 'Passed'];
export const METHODS = ['In person', 'Call', 'Text', 'DM', 'Email'];
export const TAG_RE = /^[a-z0-9][a-z0-9-]{0,29}$/;

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* "Beeline Tattoo & Art" -> "beeline-tattoo-and-art" (max 30 chars, safe in a URL) */
export function slugify(s){
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
}

/* Accepts "@handle", "handle", "instagram.com/handle", or a full profile URL. */
export function parseInstagram(input){
  let s = String(input == null ? '' : input).trim();
  if(!s) return {handle: ''};
  s = s.replace(/^https?:\/\//i, '').replace(/^(?:www\.|m\.)?instagram\.com\/?/i, '');
  s = s.replace(/^@/, '').split(/[/?#]/)[0];
  if(!/^[A-Za-z0-9._]{1,30}$/.test(s)) return {handle: '', error: "That doesn't look like an Instagram handle or link."};
  return {handle: s};
}
export const igUrl = h => 'https://www.instagram.com/' + encodeURIComponent(h) + '/';

/* ---------- dates (all local time, 'YYYY-MM-DD' strings) ---------- */
export const pad = n => String(n).padStart(2, '0');
export function todayStr(d = new Date()){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function addDays(str, n){
  const [y, m, d] = str.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}
export function fmtDate(str){
  if(!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
}
export function fmtTime(t){
  if(!t) return '';
  const [h, m] = t.split(':').map(Number);
  return ((h % 12) || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'pm' : 'am');
}
export function nextLine(s){
  if(!s || (!s.nextDate && !s.nextText)) return '';
  const when = s.nextDate ? fmtDate(s.nextDate) + (s.nextTime ? ' at ' + fmtTime(s.nextTime) : '') : '';
  return when + (when && s.nextText ? ': ' : '') + (s.nextText || '');
}
export function ago(ms, now = Date.now()){
  if(!ms) return 'never';
  const m = Math.max(0, Math.round((now - ms) / 60000));
  if(m < 1) return 'just now';
  if(m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if(h < 48) return h + ' hr ago';
  return Math.round(h / 24) + ' days ago';
}

/* ---------- tracker grouping ---------- */
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export function groupShops(shops, today){
  const g = {overdue: [], today: [], week: [], later: [], none: [], closed: []};
  const end = addDays(today, 7);
  shops.forEach(s=>{
    if(s.status === 'Booked' || s.status === 'Passed'){ g.closed.push(s); return; }
    if(!s.nextDate) g.none.push(s);
    else if(s.nextDate < today) g.overdue.push(s);
    else if(s.nextDate === today) g.today.push(s);
    else if(s.nextDate <= end) g.week.push(s);
    else g.later.push(s);
  });
  const name = s => String(s.name || '').toLowerCase();
  const when = s => (s.nextDate || '') + ' ' + (s.nextTime || '99:99') + ' ' + name(s);
  ['overdue', 'today', 'week', 'later'].forEach(k=> g[k].sort((a, b)=> cmp(when(a), when(b))));
  g.none.sort((a, b)=> cmp(name(a), name(b)));
  g.closed.sort((a, b)=> a.status === b.status ? cmp(name(a), name(b)) : (a.status === 'Booked' ? -1 : 1));
  return g;
}

/* ---------- Google Calendar link (no API needed, opens a prefilled event) ---------- */
export function calendarUrl({title, details = '', location = '', date, time = ''}){
  let dates;
  if(time){
    const [y, m, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    const f = dt => dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate()) + 'T' + pad(dt.getHours()) + pad(dt.getMinutes()) + '00';
    dates = f(new Date(y, m - 1, d, h, mi)) + '/' + f(new Date(y, m - 1, d, h, mi + 30));
  }else{
    dates = date.replace(/-/g, '') + '/' + addDays(date, 1).replace(/-/g, '');
  }
  let u = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + dates;
  if(details) u += '&details=' + encodeURIComponent(details);
  if(location) u += '&location=' + encodeURIComponent(location);
  return u;
}

/* ---------- tagged links and views ---------- */
export const tagLink = tag => SITE_URL + '?src=' + tag;

/* rows: [{at: ms, src: string}]. Tags are counted case-insensitively. */
export function aggregateViews(rows){
  const byTag = {};
  let total = 0, untagged = 0;
  rows.forEach(r=>{
    total++;
    const k = String(r.src || '').trim().toLowerCase();
    if(!k){ untagged++; return; }
    const e = byTag[k] || (byTag[k] = {count: 0, last: 0});
    e.count++;
    if((r.at || 0) > e.last) e.last = r.at || 0;
  });
  return {total, untagged, byTag};
}

/* ---------- clipboard (touches the DOM only when called) ---------- */
export function copyText(text, btn){
  const done = ()=>{
    if(!btn) return;
    const old = btn.textContent;
    btn.textContent = 'COPIED';
    setTimeout(()=>{ btn.textContent = old; }, 1500);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done, ()=>fallback());
  }else fallback();
  function fallback(){
    const t = document.createElement('textarea');
    t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try{ document.execCommand('copy'); done(); }catch(e){}
    document.body.removeChild(t);
  }
}
