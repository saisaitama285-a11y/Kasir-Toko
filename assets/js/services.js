async function handleLogin() {
    const btn = document.getElementById('login-btn');
    const token = document.getElementById('token-input').value.toUpperCase().trim();
    if (!token) return;

    btn.disabled = true;
    if (OUTLETS[token]) {
        currentUser = { role: 'kasir', name: 'Kasir', outlet: OUTLETS[token], token };
        document.body.className = "bg-slate-50 theme-kasir";
    } else if (token.startsWith('SPV')) {
        currentUser = { role: 'spv', name: 'SPV Operational', outlet: 'All Outlets', token };
        document.body.className = "bg-slate-50 theme-spv";
    } else {
        document.getElementById('login-error').innerText = "Token Tidak Valid";
        document.getElementById('login-error').classList.remove('hidden');
        btn.disabled = false;
        return;
    }

    await auth.signInAnonymously();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-display').innerText = currentUser.name;
    document.getElementById('header-outlet-name').innerText = currentUser.outlet;
    document.getElementById('role-text').innerText = currentUser.role === 'spv' ? 'Supervisor Mode' : 'Cashier Mode';
    initNavigation();
}

async function processCheckout() {
    const total = currentCart.reduce((a, b) => a + (b.price * b.qty), 0);
    const cash = parseInt(document.getElementById('cash-input').value);
    const data = {
        items: currentCart.map(it => ({...it})),
        total, cash, change: cash - total,
        method: selectedPayment,
        timestamp: firebase.firestore.Timestamp.now(),
        staff: currentUser.name,
        outlet: currentUser.outlet,
        hour: new Date().getHours()
    };
    await getPublicCol('transactions').add(data);
    showReceipt(data);
    currentCart = [];
    document.getElementById('cash-input').value = '';
    selectedPayment = 'Tunai';
    updateCartUI();
}

async function submitSaos() {
    const qtyInput = document.getElementById('saos-qty');
    const name = document.getElementById('saos-name').value;
    const qty = parseInt(qtyInput.value);
    if(!qty || qty < 1) { alert("Masukkan jumlah yang valid"); return; }
    try {
        await getPublicCol('saos_usage').add({ 
            name, qty, staff: currentUser.name, outlet: currentUser.outlet, 
            timestamp: firebase.firestore.Timestamp.now() 
        });
        qtyInput.value = 1;
        loadLocalSaosHistory();
    } catch (error) { alert("Gagal menyimpan data"); }
}

async function loadRiwayatData() {
    const listEl = document.getElementById('hist-list');
    if (!listEl) return;
    const outletFilter = document.getElementById('spv-outlet-filter')?.value || (currentUser.role === 'kasir' ? currentUser.outlet : 'ALL');
    const snap = await getPublicCol('transactions').get();
    let docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
    if(outletFilter !== 'ALL') docs = docs.filter(d => d.outlet === outletFilter);
    docs.sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));
    listEl.innerHTML = docs.map(d => `
        <div class="flex justify-between items-center py-4 px-2 hover:bg-slate-50 rounded-xl cursor-pointer" onclick='showReceipt(${JSON.stringify(d)})'>
            <div><div class="font-bold text-sm">INV-${d.id.slice(-4).toUpperCase()} [${d.outlet}]</div><div class="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">${d.staff} • ${d.method} • ${d.timestamp?.toDate().toLocaleString('id-ID')}</div></div>
            <div class="flex items-center gap-4"><div class="font-black text-indigo-600">Rp ${d.total.toLocaleString()}</div>
            ${currentUser.role === 'spv' ? `<button onclick="event.stopPropagation(); deleteTransaction('${d.id}')" class="bg-red-50 p-2 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}</div>
        </div>`).join('') || '<div class="text-center py-10 text-slate-400 font-bold">Tidak ada data</div>';
    initIcons();
}

async function loadSPVAnalytics() {
    const dateInput = document.getElementById('spv-date')?.value;
    const outlet = document.getElementById('spv-outlet-filter')?.value || 'ALL';
    if (!dateInput) return;
    const snap = await getPublicCol('transactions').get();
    let data = snap.docs.map(d => d.data());
    if(outlet !== 'ALL') data = data.filter(d => d.outlet === outlet);
    let dTot = 0, mTot = 0, yTot = 0;
    const now = new Date(dateInput);
    data.forEach(t => {
        if (!t.timestamp) return;
        const dt = t.timestamp.toDate();
        if(dt.toISOString().split('T')[0] === dateInput) dTot += t.total;
        if(dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()) mTot += t.total;
        if(dt.getFullYear() === now.getFullYear()) yTot += t.total;
    });
    document.getElementById('total-selected').innerText = `Rp ${dTot.toLocaleString('id-ID')}`;
    document.getElementById('total-month').innerText = `Rp ${mTot.toLocaleString('id-ID')}`;
    document.getElementById('total-year').innerText = `Rp ${yTot.toLocaleString('id-ID')}`;
}

async function loadSPVSaosData() {
    const dateStr = document.getElementById('saos-date').value;
    const outlet = document.getElementById('spv-outlet-filter').value;
    const snap = await getPublicCol('saos_usage').get();
    let docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
    document.getElementById('display-date-saos').innerText = `Tgl: ${new Date(dateStr).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}`;
    document.getElementById('display-outlet-saos').innerText = `Outlet: ${outlet === 'ALL' ? 'Semua Outlet' : outlet}`;
    docs = docs.filter(d => d.timestamp.toDate().toISOString().split('T')[0] === dateStr);
    if(outlet !== 'ALL') docs = docs.filter(d => d.outlet === outlet);
    docs.sort((a,b) => a.timestamp.seconds - b.timestamp.seconds);
    let totalQty = 0;
    document.getElementById('spv-saos-table').innerHTML = docs.map(d => {
        totalQty += (d.qty || 0);
        return `<tr><td class="px-6 py-4 text-blue-600 font-black uppercase text-[10px] tracking-tight">${d.outlet}</td><td class="px-6 py-4 text-slate-400">${d.timestamp.toDate().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td><td class="px-6 py-4 uppercase font-bold">${d.name}</td><td class="px-6 py-4 text-right text-sm font-black text-slate-900">${d.qty}</td><td class="px-6 py-4 text-center no-print"><button onclick="deleteSaos('${d.id}')" class="text-slate-300 hover:text-red-500 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`;
    }).join('') || '<tr><td colspan="5" class="text-center py-20 text-slate-300 font-bold uppercase tracking-widest">Tidak ada data</td></tr>';
    document.getElementById('saos-total-qty').innerText = totalQty;
    initIcons();
}

async function deleteTransaction(id) {
    if(confirm("Hapus transaksi ini?")) {
        await getPublicCol('transactions').doc(id).delete();
        loadRiwayatData();
        if (document.getElementById('spv-date')) loadSPVAnalytics();
    }
}

async function deleteSaos(id) {
    if(confirm("Hapus data saos?")) { 
        await getPublicCol('saos_usage').doc(id).delete(); 
        if(document.getElementById('saos-date')) loadSPVSaosData();
        else loadLocalSaosHistory();
    }
}

async function exportTable(targetId, filenamePrefix) {
    const target = document.getElementById(targetId);
    const btn = document.activeElement;
    const originalText = btn.innerHTML;
    const noPrintElements = target.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.style.display = 'none');
    btn.disabled = true; btn.innerText = "Processing...";
    try {
        const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = `${filenamePrefix}_${document.querySelector('input[type="date"]').value}.png`;
        link.href = image; link.click();
    } catch (e) { console.error("Export failed", e); }
    finally { noPrintElements.forEach(el => el.style.display = ''); btn.disabled = false; btn.innerHTML = originalText; initIcons(); }
}
