/* Shared tag list used by admin.html and shop.html.
   items: [{tag, note, views: {count, last} | null}]
   Each row has COPY, EDIT (descriptor only) and DELETE. */
import { esc, tagLink, copyText, ago } from './helpers.js';

export function mountTagList(el, {onSave, onDelete, empty = 'No saved tags yet.'}){
  let items = [], editing = null, draft = '';

  function meta(it){
    if(!it.views) return '';
    const v = it.views;
    return v.count ? v.count + (v.count === 1 ? ' view' : ' views') + ', last opened ' + ago(v.last) : 'not opened yet';
  }

  function row(it){
    const k = esc(it.tag);
    const top = '<div class="tl1"><span class="name">' + k + '</span><span class="btns">' +
      '<button class="solid xs" data-a="copy" data-tag="' + k + '" type="button">COPY</button>' +
      '<button class="quiet xs" data-a="edit" data-tag="' + k + '" type="button">EDIT</button>' +
      '<button class="quiet xs" data-a="del" data-tag="' + k + '" type="button">DELETE</button></span></div>';
    if(editing === it.tag){
      return '<div class="tagitem" data-tag="' + k + '">' + top +
        '<div class="tedit"><input class="noteedit" maxlength="80" value="' + esc(draft) + '" aria-label="Descriptor for ' + k + '">' +
        '<button class="solid xs" data-a="save" data-tag="' + k + '" type="button">SAVE</button>' +
        '<button class="quiet xs" data-a="cancel" type="button">CANCEL</button></div></div>';
    }
    const m = meta(it);
    const line = (it.note ? esc(it.note) : '') + (it.note && m ? ' &middot; ' : '') + esc(m);
    return '<div class="tagitem" data-tag="' + k + '">' + top + (line ? '<p class="tnote">' + line + '</p>' : '') + '</div>';
  }

  function render(next){
    if(next) items = next;
    const cur = el.querySelector('input.noteedit');
    if(cur) draft = cur.value;
    if(editing && !items.some(i => i.tag === editing)) editing = null;
    el.innerHTML = items.length ? items.map(row).join('') : '<p class="muted" style="font-size:16px"><i>' + esc(empty) + '</i></p>';
  }

  el.addEventListener('click', async e=>{
    const b = e.target.closest('button[data-a]');
    if(!b) return;
    const k = b.dataset.tag, it = items.find(i => i.tag === k);
    const a = b.dataset.a;
    if(a === 'copy'){ copyText(tagLink(k), b); }
    else if(a === 'edit' && it){ editing = k; draft = it.note || ''; render(); const i = el.querySelector('input.noteedit'); if(i){ i.focus(); i.select(); } }
    else if(a === 'cancel'){ editing = null; render(); }
    else if(a === 'save'){
      const inp = el.querySelector('input.noteedit');
      const note = (inp ? inp.value : draft).trim().slice(0, 80);
      editing = null;
      render();
      await onSave(k, note);
    }
    else if(a === 'del'){ await onDelete(k); }
  });
  el.addEventListener('keydown', e=>{
    if(e.key === 'Enter' && e.target.matches('input.noteedit')){ e.preventDefault(); el.querySelector('button[data-a="save"]').click(); }
    if(e.key === 'Escape' && editing){ editing = null; render(); }
  });
  return {render};
}
