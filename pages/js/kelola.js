// ======================================
// KONSTANTA & KONFIGURASI UMUM
// ======================================
const API_BASE_URL = 'http://127.0.0.1:5000/api';
// Element Modal & Form BARU (dari kelola.html yang sudah disesuaikan)
const mainDataModal = document.getElementById('mainDataModal');
const makananForm = document.getElementById('makananForm');
const modalTitle = document.getElementById('modalTitle');
const saveButtonText = document.getElementById('saveButtonText');
const foodIdInput = document.getElementById('foodId');

// ======================================
// STATE GLOBAL UNTUK PAGINATION & FILTER BARU
// ======================================
let currentPage = 1;
let itemsPerPage = 50; // Sesuaikan dengan nilai 'limit' default di BE Anda
let lastSearch = '';
let lastKategori = '';
let lastJenis = '';

// ======================================
// FUNGSI KONTROL MODAL
// ======================================
function showModal() {
    if (mainDataModal) mainDataModal.classList.remove('hidden');
}
function hideModal() {
    if (mainDataModal) mainDataModal.classList.add('hidden');
}

// ======================================
// HITUNG NUTRISI SAJIAN OTOMATIS SEBELUM SAVE
// ======================================
function hitungNutrisiSajianSebelumSave(foodData) {
    const berat = parseFloat(foodData.Berat_Sajian_Standar_g || 0);
    const fields100g = ['Kalori_g','Protein_g','Lemak_g','Karbohidrat_g','Serat_g'];
    const fieldsSajian = ['Kalori_Sajian_g','Protein_Sajian_g','Lemak_Sajian_g','Karbohidrat_Sajian_g','Serat_Sajian_g'];

    fields100g.forEach((field, i) => {
        const val = parseFloat(foodData[field] || 0);
        foodData[fieldsSajian[i]] = parseFloat((val * berat / 100).toFixed(2));
    });
    return foodData;
}

// ======================================
// RENDER TABEL MAKANAN
// ======================================
function renderTable(data) {
    const tbody = document.querySelector('#makananTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">Data makanan tidak ditemukan.</td></tr>`;
        return;
    }

    data.forEach((item, index) => {
        const nomor = (currentPage - 1) * itemsPerPage + (index + 1);
        const kaloriSajianDisplay = item.Kalori_Sajian_g ?? item.Kalori_Sajian;
        const beratSajianDisplay = item.Berat_Sajian_Standar_g ?? item.Berat_Sajian;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="text-left">${nomor}</td>
            <td class="text-left font-semibold">${item.Makanan}</td>
            <td class="text-left">${item.Kategori}</td>
            <td class="text-left">${item.Jenis_Makanan}</td>
            <td class="text-right">${kaloriSajianDisplay}</td>
            <td class="text-right">${beratSajianDisplay}</td>
            <td class="flex justify-center space-x-1">
                <button 
                    class="text-orange-500 hover:text-orange-700 p-1 rounded-full hover:bg-orange-100 transition-colors editBtn"
                    data-id="${item.id}"
                    title="Edit"
                    onclick="openModal(${item.id})">
                    <i class='bx bx-edit-alt text-lg'></i>
                </button>
                <button 
                    class="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors deleteBtn"
                    data-id="${item.id}"
                    data-name="${item.Makanan}"
                    title="Hapus"
                    onclick="confirmDelete(${item.id}, '${item.Makanan}')">
                    <i class='bx bx-trash text-lg'></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ======================================
// PAGINATION
// ======================================
function updatePaginationControls(pagination) {
    const { total_items, total_pages, current_page, limit } = pagination;
    const paginationControls = document.getElementById('paginationControls');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const currentPageDisplay = document.getElementById('currentPageDisplay');

    if (!paginationControls || !paginationInfo || !prevPageBtn || !nextPageBtn || !currentPageDisplay) return;

    paginationControls.classList.remove('hidden');

    const startItem = (current_page - 1) * limit + 1;
    const endItem = Math.min(current_page * limit, total_items);

    paginationInfo.textContent = total_items > 0
        ? `Menampilkan ${startItem}-${endItem} dari ${total_items} data.`
        : 'Tidak ada data ditemukan.';

    currentPage = current_page;
    currentPageDisplay.textContent = current_page;
    prevPageBtn.disabled = current_page <= 1;
    nextPageBtn.disabled = current_page >= total_pages;
}

// ======================================
// FETCH MAKANAN (FILTER + PAGINATION)
// ======================================
async function fetchMakanan() {
    // 1. Ambil nilai filter
    const search = document.getElementById('searchInput')?.value || '';
    const kategori = document.getElementById('kategoriFilter')?.value || '';
    const jenis = document.getElementById('jenisFilter')?.value || '';

    // Reset halaman ke 1 jika filter berubah
    if (search !== lastSearch || kategori !== lastKategori || jenis !== lastJenis) {
        currentPage = 1;
    }

    lastSearch = search;
    lastKategori = kategori;
    lastJenis = jenis;

    // 2. PERBAIKAN UTAMA: Ganti '/makanan' menjadi '/makanan/paginate'
    const url = `${API_BASE_URL}/makanan/paginate` +
    `?search=${encodeURIComponent(search)}` +
    `&kategori=${encodeURIComponent(kategori)}` +
    `&jenis=${encodeURIComponent(jenis)}` +
    `&page=${currentPage}` +
    `&limit=${itemsPerPage}`;

    const tbody = document.querySelector('#makananTableBody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">Memuat data...</td></tr>`;

    try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (response.ok && result.success) { // Pastikan 'success: true' dari BE
            const data = result.data || [];
            renderTable(data);
            
            // 3. Panggil fungsi update pagination
            if (result.pagination) {
                updatePaginationControls(result.pagination);
            } else {
                // Sembunyikan jika tidak ada data pagination (misalnya, BE error)
                document.getElementById('paginationControls')?.classList.add('hidden');
            }
        } else {
            Swal.fire({ icon: 'error', title: result.message || 'Gagal memuat data' });
            if(tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">Gagal memuat data: ${result.message || 'Error Server'}</td></tr>`;
            document.getElementById('paginationControls')?.classList.add('hidden');
        }
    } catch (err) {
        console.error("Error Jaringan:", err);
        Swal.fire({ icon: 'error', title: 'Terjadi kesalahan jaringan' });
        if(tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">Terjadi kesalahan jaringan.</td></tr>`;
        document.getElementById('paginationControls')?.classList.add('hidden');
    }
}

// ======================================
// FUNGSI BARU: UPDATE KONTROL PAGINATION
// ======================================
function updatePaginationControls(pagination) {
    const { total_pages, current_page, total_items, limit } = pagination;
    
    const infoElement = document.getElementById('paginationInfo');
    const controlsElement = document.getElementById('paginationControls');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageDisplay = document.getElementById('currentPageDisplay');
    
    // 1. Sembunyikan kontrol jika total halaman hanya 1
    if (total_pages <= 1) {
        controlsElement?.classList.add('hidden');
        if (infoElement) infoElement.innerHTML = `Total ${total_items} item`;
        return;
    }
    
    // Tampilkan kembali kontrol
    controlsElement?.classList.remove('hidden');

    // 2. Update Display Halaman
    if (pageDisplay) pageDisplay.textContent = current_page;
    
    // 3. Hitung Item yang Ditampilkan untuk info teks
    const startItem = (current_page - 1) * limit + 1;
    const endItem = Math.min(current_page * limit, total_items);
    
    // 4. Update Info Teks
    if (infoElement) {
        infoElement.innerHTML = 
            `Menampilkan ${startItem}-${endItem} dari ${total_items} item (Halaman ${current_page} dari ${total_pages})`;
    }

    // 5. Atur Status Tombol (Disabled)
    if (prevBtn) prevBtn.disabled = current_page === 1;
    if (nextBtn) nextBtn.disabled = current_page === total_pages;
}

// ======================================
// GANTI HALAMAN
// ======================================
function changePage(delta) {
    // Pastikan currentPage adalah angka sebelum dioperasikan
    const newPage = (typeof currentPage === 'number' ? currentPage : 1) + delta; 
    
    // Tidak perlu membatasi dengan total_pages di sini, biarkan fetchMakanan yang menangani
    // dan updatePaginationControls menonaktifkan tombol next jika sudah halaman terakhir
    if (newPage >= 1) {
        currentPage = newPage;
        fetchMakanan();
    }
}

// ======================================
// OPEN MODAL (EDIT / TAMBAH)
// ======================================
async function openModal(foodId = null) {
    makananForm.reset();
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
    document.querySelector('.tab-button[data-target="umum"]').classList.add('active');
    document.getElementById('umum').classList.remove('hidden');

    if (foodId) {
        modalTitle.textContent = 'Edit Data Makanan';
        saveButtonText.textContent = 'Update Data';
        try {
            const response = await fetch(`${API_BASE_URL}/makanan/${foodId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const food = await response.json();

            document.getElementById('foodId').value = food.id;
            document.getElementById('Makanan').value = food.Makanan;
            document.getElementById('Kategori').value = food.Kategori;
            document.getElementById('Jenis_Makanan').value = food.Jenis_Makanan;
            document.getElementById('Berat_Sajian_Standar_g').value = parseFloat(food.Berat_Sajian_Standar_g);

            document.getElementById('Kalori_g').value = parseFloat(food.Kalori_g);
            document.getElementById('Protein_g').value = parseFloat(food.Protein_g);
            document.getElementById('Lemak_g').value = parseFloat(food.Lemak_g);
            document.getElementById('Karbohidrat_g').value = parseFloat(food.Karbohidrat_g);
            document.getElementById('Serat_g').value = parseFloat(food.Serat_g);

            document.getElementById('Kalori_Sajian_g').value = parseFloat(food.Kalori_Sajian_g);
            document.getElementById('Protein_Sajian_g').value = parseFloat(food.Protein_Sajian_g);
            document.getElementById('Lemak_Sajian_g').value = parseFloat(food.Lemak_Sajian_g);
            document.getElementById('Karbohidrat_Sajian_g').value = parseFloat(food.Karbohidrat_Sajian_g);
            document.getElementById('Serat_Sajian_g').value = parseFloat(food.Serat_Sajian_g);

            showModal();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Gagal memuat detail makanan.' });
            console.error(error);
        }
    } else {
        modalTitle.textContent = 'Tambah Data Makanan Baru';
        saveButtonText.textContent = 'Simpan Data';
        foodIdInput.value = ''; 
        showModal();
    }
}

// ======================================
// SAVE DATA (CREATE / UPDATE)
// ======================================
async function saveMakanan() {
    const foodId = foodIdInput.value;
    const isEdit = !!foodId;

    if (!makananForm.checkValidity()) {
        makananForm.reportValidity();
        return;
    }

    const formElements = makananForm.querySelectorAll('input, select');
    const foodData = {};
    formElements.forEach(el => {
        if (el.name && el.name !== 'id') {
            const numericFields = ['Berat_Sajian_Standar_g','Kalori_g','Protein_g','Lemak_g','Karbohidrat_g','Serat_g','Kalori_Sajian_g','Protein_Sajian_g','Lemak_Sajian_g','Karbohidrat_Sajian_g','Serat_Sajian_g'];
            foodData[el.name] = numericFields.includes(el.name) ? parseFloat(el.value) : el.value;
        }
    });

    // ===== HITUNG OTOMATIS SEBELUM KIRIM KE BACKEND =====
    hitungNutrisiSajianSebelumSave(foodData);

    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `${API_BASE_URL}/makanan/${foodId}` : `${API_BASE_URL}/makanan`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(foodData),
        });
        const result = await response.json();

        if (response.ok) {
            Swal.fire({ icon: 'success', title: result.message, timer: 1500, showConfirmButton: false });
            hideModal();
            fetchMakanan();
        } else {
            Swal.fire({ icon: 'error', title: 'Gagal menyimpan data: ' + (result.message || 'Error tidak diketahui') });
        }
    } catch (error) {
        console.error('Error saat menyimpan data:', error);
        Swal.fire({ icon: 'error', title: 'Terjadi error saat komunikasi dengan server.' });
    }
}

// ======================================
// DELETE DATA
// ======================================
async function confirmDelete(id, foodName) {
    const result = await Swal.fire({
        title: `Hapus data "${foodName}"?`,
        text: 'Data akan dihapus permanen dari database.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal',
        reverseButtons: false
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`${API_BASE_URL}/makanan/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Data berhasil dihapus!', timer: 1500, showConfirmButton: false });
                fetchMakanan();
            } else {
                Swal.fire({ icon: 'error', title: data.message || 'Gagal hapus data' });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'Terjadi kesalahan jaringan' });
        }
    }
}

// ======================================
// LOGIKA LOGOUT & PROFIL
// ======================================
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const response = await fetch('http://127.0.0.1:5000/api/admin/logout', { method: 'GET', credentials: 'include' });
        if (response.ok) window.location.href = '/?status=logout_success';
        else alert('Gagal logout. Silakan coba lagi.');
    } catch (error) {
        console.error('Error saat koneksi logout:', error);
        alert('Terjadi kesalahan jaringan.');
    }
});

// Load profil admin
fetch("http://127.0.0.1:5000/api/admin/profile", { method: "GET", credentials: "include" })
.then(res => res.json())
.then(data => {
    if (!data || !data.success) return;
    const usernameEl = document.getElementById("username");
    const profilePicEl = document.getElementById("profile-pic");
    if (usernameEl) usernameEl.textContent = data.username;
    if (profilePicEl) {
        const newSrc = data.profile_pic ? `http://127.0.0.1:5000${data.profile_pic}?v=${Date.now()}` : "https://i.pravatar.cc/60?img=12";
        if(profilePicEl.src !== newSrc){
            profilePicEl.style.opacity = "0";
            profilePicEl.onload = () => { profilePicEl.style.transition="opacity .25s ease"; profilePicEl.style.opacity="1"; };
            profilePicEl.src = newSrc;
        }
    }
}).catch(err => console.error("Gagal load profil:", err));

// ======================================
// EVENT LISTENER & INITIAL LOAD
// ======================================
document.addEventListener('DOMContentLoaded', fetchMakanan);
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput')?.addEventListener('input', fetchMakanan);
    document.getElementById('kategoriFilter')?.addEventListener('change', fetchMakanan);
    document.getElementById('jenisFilter')?.addEventListener('change', fetchMakanan);
});
