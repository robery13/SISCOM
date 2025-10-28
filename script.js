(function(){
  const LS_KEY = 'siscom_pedidos';
  const openBtn = document.getElementById('open-create-order');
  const modalEl = document.getElementById('createOrderModal');
  const modal = new bootstrap.Modal(modalEl);
  const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
  const historyList = document.getElementById('historyList');
  const clearAllBtn = document.getElementById('clearAll');
  const itemsTableBody = document.querySelector('#itemsTable tbody');
  const addEmptyRowBtn = document.getElementById('addEmptyRow');
  const farmaciaSelect = document.getElementById('farmaciaSelect');
  const notasInput = document.getElementById('notas');
  const adjuntoInput = document.getElementById('adjunto');
  const previewBtn = document.getElementById('previewBtn');
  const sendBtn = document.getElementById('sendBtn');
  const previewContent = document.getElementById('previewContent');
  const formMessage = document.getElementById('formMessage');
  const detailBody = document.getElementById('detailBody');

  openBtn.onclick = () => modal.show();
  addEmptyRowBtn.onclick = () => addRow();

  function addRow(){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="form-control form-control-sm txt-name" placeholder="Medicamento"></td>
      <td><input class="form-control form-control-sm txt-dose" placeholder="Dosis"></td>
      <td><input type="number" class="form-control form-control-sm num" min="0" value="1"></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger">✕</button></td>`;
    tr.querySelector('button').onclick = ()=>tr.remove();
    itemsTableBody.appendChild(tr);
  }

  function loadOrders(){ try{return JSON.parse(localStorage.getItem(LS_KEY))||[]}catch{return[]} }
  function saveOrders(list){ localStorage.setItem(LS_KEY,JSON.stringify(list)) }

  previewBtn.onclick = async ()=>{
    const o = await buildOrder();
    if(!o)return;
    previewContent.textContent = JSON.stringify(o,null,2);
  };

  sendBtn.onclick = async ()=>{
    const o = await buildOrder();
    if(!o)return;
    const list = loadOrders(); list.unshift(o); saveOrders(list);
    renderHistory();
    showMsg('Pedido guardado localmente','text-success');
    setTimeout(()=>{modal.hide(); resetForm();},1000);
  };

  async function buildOrder(){
    const farmacia = farmaciaSelect.value.trim();
    if(!farmacia) return showMsg('Seleccione una farmacia','text-danger');
    const items = [...itemsTableBody.querySelectorAll('tr')].map(r=>({
      nombre:r.querySelector('.txt-name').value.trim(),
      dosis:r.querySelector('.txt-dose').value.trim(),
      cantidad:+r.querySelector('.num').value
    })).filter(i=>i.nombre && i.cantidad>0);
    if(!items.length)return showMsg('Debe agregar al menos un medicamento','text-danger');
    let adjunto=null;
    const f=adjuntoInput.files[0];
    if(f){
      if(f.size>5*1024*1024)return showMsg('Archivo >5MB','text-danger');
      adjunto={nombre:f.name,tipo:f.type,tamanio:f.size,base64:await toB64(f)};
    }
    clearMsg();
    const now=new Date().toISOString();
    return {id:'P-'+Date.now().toString(36),farmacia,items,adjunto,notas:notasInput.value.trim(),estado:'Pendiente',fecha_creacion:now};
  }

  function toB64(f){return new Promise((res,rej)=>{const r=new FileReader();r.onerror=rej;r.onload=()=>res(r.result);r.readAsDataURL(f);});}

  function showMsg(msg,cls){formMessage.className='fw-semibold '+cls;formMessage.textContent=msg;}
  function clearMsg(){formMessage.textContent='';}
  function resetForm(){itemsTableBody.innerHTML='';farmaciaSelect.value='';notasInput.value='';adjuntoInput.value='';previewContent.textContent='Aún no hay previsualización.';}

  function renderHistory(){
    const list=loadOrders(); historyList.innerHTML='';
    if(!list.length)return historyList.innerHTML='<div class="text-muted small">No hay pedidos guardados.</div>';
    list.forEach(o=>{
      const div=document.createElement('div');
      div.className='border rounded p-2 bg-white d-flex justify-content-between align-items-center';
      div.innerHTML=`
        <div>
          <strong>${o.id}</strong><br>
          <small>${new Date(o.fecha_creacion).toLocaleString()} — ${o.farmacia}</small><br>
          <small>${o.items.length} ítem(s) — ${o.estado}</small>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-secondary me-2">Ver</button>
          <button class="btn btn-sm btn-outline-danger">Eliminar</button>
        </div>`;
      const [viewBtn,delBtn]=div.querySelectorAll('button');
      viewBtn.onclick=()=>showDetail(o);
      delBtn.onclick=()=>{if(confirm('¿Eliminar este pedido?')){saveOrders(loadOrders().filter(x=>x.id!==o.id));renderHistory();}};
      historyList.appendChild(div);
    });
  }

  function showDetail(o){
    detailBody.innerHTML=`
      <p><strong>ID:</strong> ${o.id}</p>
      <p><strong>Farmacia:</strong> ${o.farmacia}</p>
      <p><strong>Fecha:</strong> ${new Date(o.fecha_creacion).toLocaleString()}</p>
      <h6>Medicamentos</h6>
      <ul>${o.items.map(i=>`<li>${i.nombre} — ${i.dosis} — x${i.cantidad}</li>`).join('')}</ul>
      ${o.adjunto?`<p><strong>Adjunto:</strong> ${o.adjunto.nombre} (${Math.round(o.adjunto.tamanio/1024)} KB)</p>`:''}
      <p><strong>Notas:</strong> ${o.notas||'(sin notas)'}</p>`;
    detailModal.show();
  }

  clearAllBtn.onclick=()=>{if(confirm('¿Borrar todo el historial?')){localStorage.removeItem(LS_KEY);renderHistory();}};
  renderHistory();
})();
