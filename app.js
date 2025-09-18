// app.js — Boketeミニサイト with 管理者モード対応
const $ = sel => document.querySelector(sel);
const qs = sel => Array.from(document.querySelectorAll(sel));
const uid = () => 'id-' + Math.random().toString(36).slice(2,9);

const STORAGE_IMAGES = 'bokete_images_pool_v2';
const STORAGE_BOKES = 'bokete_boketes_v2';

function load(key){ try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ return [] } }
function save(key,data){ localStorage.setItem(key,JSON.stringify(data)); }

let imagesPool = load(STORAGE_IMAGES);
let boketes = load(STORAGE_BOKES);
let currentSort = 'time';

const btnAddImage = $('#btn-add-image');
const btnBoke = $('#btn-boke');
const panelUpload = $('#panel-upload');
const panelBoke = $('#panel-boke');
const feed = $('#feed');
const imageUrlInput = $('#image-url-input');
const submitUrl = $('#submit-url');
const dragBox = $('#drag-box');
const fileInput = $('#file-input');
const submitDrag = $('#submit-drag');
const closeUpload = $('#close-upload');
const imagesList = $('#images-list');
const bokeEditor = $('#boke-editor');
const editorImage = $('#editor-image');
const bokeText = $('#boke-text');
const submitBoke = $('#submit-boke');
const btnRandom = $('#btn-random');
const closeBoke = $('#close-boke');
const sortRadios = qs('input[name="sort"]');
const adminPanel = $('#admin-panel');
const adminList = $('#admin-list');
const closeAdmin = $('#close-admin');

// --- イベント ---
btnAddImage.onclick = ()=> panelUpload.classList.toggle('hidden');
closeUpload.onclick = ()=> panelUpload.classList.add('hidden');
btnBoke.onclick = ()=> { panelBoke.classList.toggle('hidden'); refreshImagesList(); };
closeBoke.onclick = ()=> panelBoke.classList.add('hidden');
closeAdmin.onclick = ()=> adminPanel.classList.add('hidden');

// URL投稿
submitUrl.onclick = ()=>{
  const url = imageUrlInput.value.trim();
  if(!url) return alert('URLを入力してね');
  imagesPool.unshift({ id: uid(), src: url, ts: Date.now() });
  save(STORAGE_IMAGES, imagesPool);
  imageUrlInput.value = '';
  refreshImagesList();
};

// ファイル投稿
dragBox.onclick = ()=> fileInput.click();
dragBox.ondragover = e=>{ e.preventDefault(); dragBox.classList.add('dragover'); };
dragBox.ondragleave = ()=> dragBox.classList.remove('dragover');
dragBox.ondrop = e=>{ e.preventDefault(); dragBox.classList.remove('dragover'); handleFiles(e.dataTransfer.files); };
fileInput.onchange = e=> handleFiles(e.target.files);
submitDrag.onclick = ()=> handleFiles(fileInput.files);

function handleFiles(files){
  const f = files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    imagesPool.unshift({ id: uid(), src: reader.result, ts: Date.now() });
    save(STORAGE_IMAGES, imagesPool);
    refreshImagesList();
    alert('画像を追加したよ（お題画像プール）');
  };
  reader.readAsDataURL(f);
}

// --- ボケ投稿 ---
function refreshImagesList(){
  imagesList.innerHTML = '';
  const seen = new Set();
  imagesPool.forEach(item=>{
    if(seen.has(item.src)) return;
    seen.add(item.src);
    const div = document.createElement('div');
    div.className = 'small-thumb';
    div.innerHTML = `<img src="${item.src}" />`;
    div.onclick = ()=> openEditorFor(item);
    imagesList.appendChild(div);
  });
}
function openEditorFor(item){
  bokeEditor.classList.remove('hidden');
  editorImage.src = item.src;
  editorImage.dataset.imageId = item.id;
  bokeText.value = '';
}
btnRandom.onclick = ()=>{
  if(imagesPool.length===0) return alert('まずはお題画像を投稿してね');
  const pick = imagesPool[Math.floor(Math.random()*imagesPool.length)];
  openEditorFor(pick);
};
submitBoke.onclick = ()=>{
  const text = bokeText.value.trim();
  if(!text) return alert('ボケを入力してね');
  const bok = {
    id: uid(),
    imageId: editorImage.dataset.imageId,
    src: editorImage.src,
    text,
    rating: 0,
    ts: Date.now()
  };
  boketes.unshift(bok);
  save(STORAGE_BOKES, boketes);
  renderFeed();
};

// --- 表示 ---
sortRadios.forEach(r=> r.onchange = ()=>{ currentSort = r.value; renderFeed(); });

function renderFeed(){
  feed.innerHTML = '';
  let list = [...boketes];
  if(currentSort==='popular') list.sort((a,b)=> b.rating-a.rating);
  else list.sort((a,b)=> b.ts-a.ts);

  list.forEach(b=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.bokeId = b.id;
    card.innerHTML = `
      <div class="thumb"><img src="${b.src}" /></div>
      <div class="body">
        <p class="caption">${b.text}</p>
        <div class="meta">
          <div class="stars">
            ${[1,2,3].map(n=>`<span class="star ${b.rating>=n?'active':''}" data-id="${b.id}" data-val="${n}">★</span>`).join('')}
          </div>
          <span>${new Date(b.ts).toLocaleString()}</span>
        </div>
      </div>
    `;
    feed.appendChild(card);
  });

  qs('.star').forEach(st=>{
    st.onclick = ()=>{
      const id = st.dataset.id;
      const val = parseInt(st.dataset.val);
      const target = boketes.find(b=> b.id===id);
      if(target){ target.rating = val; save(STORAGE_BOKES, boketes); renderFeed(); }
    };
  });
}

// --- 管理者モード ---
document.addEventListener('keydown', e=>{
  if(e.ctrlKey && e.altKey && e.code==='Space'){
    openAdminPanel();
  }
});
function openAdminPanel(){
  adminPanel.classList.remove('hidden');
  adminList.innerHTML = '';

  // お題画像
  imagesPool.forEach(img=>{
    const div = document.createElement('div');
    div.className = 'admin-card';
    div.innerHTML = `<img src="${img.src}" /><button class="btn btn-ghost">削除</button>`;
    div.querySelector('button').onclick = ()=>{
      imagesPool = imagesPool.filter(i=> i.id!==img.id);
      save(STORAGE_IMAGES, imagesPool);
      div.remove();
      refreshImagesList();
      alert('画像を削除しました');
    };
    adminList.appendChild(div);
  });

  // ボケ投稿一覧に削除ボタン
  boketes.forEach(b=>{
    const div = document.createElement('div');
    div.className = 'admin-card';
    div.innerHTML = `<span>${b.text}</span><button class="btn btn-ghost">削除</button>`;
    div.querySelector('button').onclick = ()=>{
      boketes = boketes.filter(x=> x.id!==b.id);
      save(STORAGE_BOKES, boketes);
      div.remove();
      renderFeed();
      alert('ボケを削除しました');
    };
    adminList.appendChild(div);
  });
}

// 初期描画
renderFeed();
