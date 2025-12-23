// ============================================
// KONSTANTA URL
// ============================================
const BASE_URL = "http://127.0.0.1:5000";
const PROFILE_URL = `${BASE_URL}/api/admin/profile`;
const LOGOUT_URL = `${BASE_URL}/api/admin/logout`;
const STATS_MAKANAN_URL = `${BASE_URL}/api/stats/makanan`;
const RECENT_ACTIVITY_URL = `${BASE_URL}/api/makanan/terbaru`; // URL untuk Aktivitas Terbaru
const STATS_RECOMMENDATION_URL = `${BASE_URL}/api/stats/recommendation`;

let userTrendData = [];
let topFoodsData = [];

// =======================================================
// 1. Fungsi Render Donut Chart Tren User dengan label tengah
// =======================================================
function renderUserTrendChart(trendData = []) {
    const canvas = document.getElementById("user-trend-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const labels = trendData.map(t => t.name);
    const values = trendData.map(t => parseInt(t.value));
    const colors = trendData.map(t => {
        if(t.name === "Cutting") return '#16a34a';
        if(t.name === "Bulking") return '#f97316';
        if(t.name === "Maintenance") return '#2563eb';
        return '#9ca3af';
    });

    if (window.userTrendChart) window.userTrendChart.destroy();

    window.userTrendChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 4,
                hoverOffset: 20, // lebih “melompat” saat hover
                spacing: 4       // jarak antar slice
            }]
        },
        options: {
            cutout: '55%',          // donut lebih tebal
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1200,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#374151',
                        font: { size: 14, weight: '600' },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleColor: '#f9fafb',
                    bodyColor: '#f9fafb',
                    bodyFont: { weight: '500' },
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed}%`;
                        }
                    }
                }
            }
        }
    });
}

// =======================================================
// 2. Fungsi Render Dashboard Card & Top Foods dengan badge
// =======================================================
function renderDashboardCards({ totalMakanan = '--', totalKategori = '--', modelStatus = 'KNN Ready' }) {
    const totalMakananEl = document.getElementById("total-makanan");
    const totalKategoriEl = document.getElementById("total-kategori");
    const modelStatusEl = document.getElementById("model-status");

    if (totalMakananEl) totalMakananEl.textContent = totalMakanan;
    if (totalKategoriEl) totalKategoriEl.textContent = totalKategori;
    if (modelStatusEl) modelStatusEl.textContent = modelStatus;

    // === USER TREND ===
    if (userTrendData.length > 0) {
        renderUserTrendChart(userTrendData);
    } else {
        renderUserTrendChart([
            { name: "Belum Ada Data", value: 100 }
        ]);
    }

    // === TOP FOODS ===
    const topFoodsContainer = document.getElementById("top-foods");
    if (!topFoodsContainer) return;

    topFoodsContainer.innerHTML = '';

    if (topFoodsData.length === 0) {
        topFoodsContainer.innerHTML = `
            <li class="py-4 text-center text-gray-400">
                Belum ada data rekomendasi
            </li>
        `;
        return;
    }

    topFoodsData.forEach(food => {
        const li = document.createElement("li");
        li.className = "py-2 flex justify-between items-center";
        li.innerHTML = `
            <span class="text-gray-800 font-medium">${food.name}</span>
            <span class="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                ${food.count}x
            </span>
        `;
        topFoodsContainer.appendChild(li);
    });
}


// =======================================================
// 3. Fungsi Fetch Dashboard Data dari Backend
// =======================================================
async function fetchDashboardData() {
    renderDashboardCards({ totalMakanan: '...', totalKategori: '...', modelStatus: 'Loading...' });

    try {
        const response = await fetch(STATS_MAKANAN_URL, { method: 'GET', credentials: 'include' });

        if (response.status === 401) {
            renderDashboardCards({ totalMakanan: 'Expired', totalKategori: '-', modelStatus: 'Session Expired' });
            return;
        }

        if (!response.ok) {
            renderDashboardCards({ totalMakanan: `HTTP ${response.status}`, totalKategori: '-', modelStatus: 'Error' });
            return;
        }

        const result = await response.json();
        if (result.success) {
            // === fallback total_kategori ===
            const totalKategori = result.total_kategori !== undefined ? result.total_kategori : 0;

            renderDashboardCards({
                totalMakanan: result.total_makanan ?? 0,
                totalKategori: totalKategori,
                modelStatus: 'KNN Ready'
            });
        } else {
            renderDashboardCards({ totalMakanan: 0, totalKategori: 0, modelStatus: 'Data Error' });
        }
    } catch (error) {
        console.error('Error jaringan saat fetch dashboard:', error);
        renderDashboardCards({ totalMakanan: 'ERR', totalKategori: 'ERR', modelStatus: 'Offline' });
    }
}


// =======================================================
// 4. Fungsi Fetch Aktivitas Terbaru
// =======================================================
async function fetchRecentActivity() {
    const activityList = document.getElementById('recent-activity');
    if (!activityList) return;

    activityList.innerHTML = '<li class="p-3 text-center text-gray-400">Memuat aktivitas terbaru...</li>';

    try {
        const response = await fetch(RECENT_ACTIVITY_URL, { method: 'GET', credentials: 'include' });
        const result = await response.json();

        if (response.ok && result.success) {
            const data = result.data.slice(0, 5); // ambil 5 terbaru saja
            activityList.innerHTML = '';
            if (data.length === 0) {
                activityList.innerHTML = '<li class="py-3 text-center text-gray-500">Belum ada data makanan yang ditambahkan.</li>';
                return;
            }

            data.forEach(item => {
                let displayDate = 'Tgl tidak valid';
                try {
                    const dateObj = new Date(item.tanggal_ditambahkan);
                    displayDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                } catch (e) {
                    displayDate = item.tanggal_ditambahkan;
                }

                const li = document.createElement('li');
                li.className = 'mb-3 p-3 bg-white rounded-lg shadow-sm flex justify-between items-start hover:shadow-md transition-shadow duration-200';
                li.innerHTML = `
                    <div class="flex items-start space-x-3">
                        <i class='bx bx-dish text-2xl text-green-500 flex-shrink-0 mt-1'></i>
                        <div>
                            <p class="text-gray-800 font-medium">
                                Admin menambahkan: <span class="font-semibold text-green-700">${item.Makanan}</span>
                            </p>
                            <p class="mt-1">
                                <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">
                                    ${item.Kategori}
                                </span>
                            </p>
                        </div>
                    </div>
                    <span class="text-xs text-gray-400 font-medium mt-1">${displayDate}</span>
                `;
                activityList.appendChild(li);
            });
        } else {
            activityList.innerHTML = `<li class="py-3 text-red-500 text-center">Gagal memuat aktivitas: ${result.message || 'Server error'}</li>`;
        }
    } catch (error) {
        console.error("Error fetching recent activity:", error);
        activityList.innerHTML = '<li class="py-3 text-red-500 text-center">Terjadi kesalahan jaringan.</li>';
    }
}


// =======================================================
// 4. Fungsi Fetch Stats Recommendation
// =======================================================
async function fetchRecommendationStats() {
    try {
        const res = await fetch(STATS_RECOMMENDATION_URL, {
            method: 'GET',
            credentials: 'include'
        });

        if (!res.ok) return;

        const result = await res.json();
        if (!result.success) return;

        // ===== USER TREND =====
        userTrendData = Object.entries(result.user_trend || {}).map(
            ([key, val]) => ({
                name: key,
                value: val
            })
        );

        // ===== TOP FOODS =====
        topFoodsData = result.top_foods || [];

        // Re-render bagian dashboard
        renderDashboardCards({
            totalMakanan: document.getElementById("total-makanan")?.textContent,
            totalKategori: document.getElementById("total-kategori")?.textContent,
            modelStatus: 'KNN Ready'
        });

    } catch (err) {
        console.error("Gagal ambil stats recommendation:", err);
    }
}

// =======================================================
// 5. Ambil Profil Admin & Render Dashboard
// =======================================================
fetch(PROFILE_URL, { method: "GET", credentials: "include" })
.then(res => {
    if (res.status === 401) {
        window.location.href = '/';
        return Promise.reject('Unauthorized');
    }
    return res.json();
})
.then(data => {
    if (!data.success) {
        window.location.href = '/';
        return;
    }

    const usernameEl = document.getElementById("username");
    const greetingEl = document.getElementById("greeting");
    const profilePicEl = document.getElementById("profile-pic");

    if (data.username) {
        greetingEl.textContent = `Selamat Datang, ${data.username} 👋`;
        usernameEl.textContent = data.username;
    }

    if (profilePicEl) {
        if (data.profile_pic) {
            const newSrc = `${BASE_URL}${data.profile_pic}?v=${Date.now()}`;
            profilePicEl.style.opacity = "0";
            profilePicEl.style.transition = "opacity .25s ease";

            const preload = new Image();
            preload.src = newSrc;
            preload.onload = () => {
                profilePicEl.src = newSrc;
                profilePicEl.style.opacity = "1";
            };
        } else {
            profilePicEl.src = "https://i.pravatar.cc/60?u=default";
            profilePicEl.style.opacity = "1";
        }
    }

    fetchDashboardData();
    fetchRecentActivity();
    fetchRecommendationStats(); // <-- INI
})
.catch(err => {
    console.error("Gagal load profil:", err);
    if (err !== 'Unauthorized') window.location.href = '/';
});

// =======================================================
// 6. Logout
// =======================================================
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const response = await fetch(LOGOUT_URL, { method: 'GET', credentials: 'include' });
        if (response.ok) window.location.href = '/?status=logout_success';
        else alert('Gagal logout. Silakan coba lagi.');
    } catch (error) {
        console.error('Error saat logout:', error);
        alert('Terjadi kesalahan jaringan.');
    }
});
