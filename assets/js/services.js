// Fungsi mengambil data koleksi secara fleksibel
const getPublicCol = (col) => db.collection(col);

// 1. Fungsi Load Riwayat Transaksi Lengkap
window.loadRiwayatData = async function() {
    const listEl = document.getElementById('hist-list');
    if (!listEl) return;

    try {
        const snap = await getPublicCol('transactions').orderBy('timestamp', 'desc').limit(10).get();
        let docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        if (docs.length === 0) {
            listEl.innerHTML = '<p class="text-center text-slate-400 py-10">Belum ada transaksi.</p>';
            return;
        }

        listEl.innerHTML = docs.map(d => `
            <div class="flex justify-between items-center py-4 border-b border-slate-50 last:border-0">
                <div class="flex items-center gap-3">
                    <div class="bg-slate-100 p-2 rounded-xl">
                        <i data-lucide="receipt" class="w-4 h-4 text-slate-600"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm text-slate-800">INV-${d.id.slice(-4).toUpperCase()}</div>
                        <div class="text-[10px] text-slate-400">${d.timestamp ? d.timestamp.toDate().toLocaleString('id-ID') : '-'}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black text-indigo-600">Rp ${d.total ? d.total.toLocaleString() : 0}</div>
                    <button onclick="deleteTransaction('${d.id}')" class="text-[10px] text-red-400 hover:text-red-600">Hapus</button>
                </div>
            </div>`).join('');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        listEl.innerHTML = `<p class="text-red-500 text-xs">Gagal memuat: ${e.message}</p>`;
    }
};

// 2. Fungsi Hitung Omset (Analitik)
window.loadSPVAnalytics = async function() {
    const dateInput = document.getElementById('spv-date')?.value;
    if (!dateInput) return;

    const snap = await getPublicCol('transactions').get();
    let data = snap.docs.map(d => d.data());
    
    const now = new Date(dateInput);
    let dTot = 0, mTot = 0, yTot = 0;

    data.forEach(t => {
        if (!t.timestamp) return;
        const dt = t.timestamp.toDate();
        const tDate = dt.toISOString().split('T')[0];

        if(tDate === dateInput) dTot += t.total;
        if(dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()) mTot += t.total;
        if(dt.getFullYear() === now.getFullYear()) yTot += t.total;
    });

    document.getElementById('total-selected').innerText = `Rp ${dTot.toLocaleString()}`;
    document.getElementById('total-month').innerText = `Rp ${mTot.toLocaleString()}`;
    document.getElementById('total-year').innerText = `Rp ${yTot.toLocaleString()}`;
};

// 3. Fungsi Hapus Transaksi
window.deleteTransaction = async function(id) {
    if (confirm("Hapus data transaksi ini secara permanen?")) {
        try {
            await getPublicCol('transactions').doc(id).delete();
            loadRiwayatData();
            loadSPVAnalytics();
        } catch (e) { alert("Gagal menghapus: " + e.message); }
    }
};
