document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("profileForm");
  const profilePreview = document.getElementById("profilePreview");
  const fileInput = document.getElementById("profileInput");
  const fileNameEl = document.getElementById("fileName");

  // ===============================
  // ANIMASI FADE-IN GAMBAR
  // ===============================
  if (profilePreview) {
    profilePreview.classList.add("profile-img");

    if (profilePreview.complete) {
      profilePreview.classList.add("loaded");
    } else {
      profilePreview.onload = () => profilePreview.classList.add("loaded");
    }
  }

  // ===============================
  // SWEETALERT FUNCTION
  // ===============================
  function showAlert(type, message) {
    Swal.fire({
      icon: type,
      title: type === "success" ? "Berhasil" : "Gagal",
      text: message,
      confirmButtonColor: "#43a047"
    });
  }

  // ===============================
  // LOAD DATA PROFIL ADMIN (ANTI CACHE FIX)
  // ===============================
  try {
    const res = await fetch("http://127.0.0.1:5000/api/admin/profile", {
      method: "GET",
      credentials: "include",
    });

    const data = await res.json();

    if (!data.success) {
      showAlert("error", data.message || "Gagal memuat profil.");
      return;
    }

    // Username
    const usernameEl = document.getElementById("currentUsername");
    if (usernameEl && data.username) usernameEl.textContent = data.username;

    // Foto Profil — RESET FADE-IN
    profilePreview.classList.remove("loaded");

    // Base URL dari backend
    let baseURL = data.profile_pic
      ? (data.profile_pic.startsWith("http")
          ? data.profile_pic
          : `http://127.0.0.1:5000/${data.profile_pic}`)
      : "https://i.pravatar.cc/60?img=12";

    // ⛔ FIX UTAMA — Tambahkan timestamp biar GA KE-CACHE!
    baseURL = `${baseURL}?v=${Date.now()}`;

    const preload = new Image();
    preload.src = baseURL;

    preload.onload = () => {
      profilePreview.src = baseURL;
      setTimeout(() => profilePreview.classList.add("loaded"), 50);
    };

  } catch (err) {
    console.error("❌ ERROR GET PROFILE:", err);
    showAlert("error", "Tidak dapat terhubung ke server.");
  }

  // ===============================
  // PREVIEW FOTO SEBELUM UPLOAD
  // ===============================
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
      fileNameEl.textContent = "";
      return;
    }

    fileNameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (ev) => {
      profilePreview.src = ev.target.result;
      profilePreview.classList.add("loaded");
    };
    reader.readAsDataURL(file);
  });

  // ===============================
  // SAVE / UPDATE PROFIL
  // ===============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    Swal.fire({
      title: "Menyimpan...",
      text: "Mohon tunggu sebentar",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch("http://127.0.0.1:5000/api/admin/profile", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      Swal.close();

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Profil berhasil diperbarui!",
          confirmButtonColor: "#43a047"
        }).then(() => window.location.reload());
      } else {
        showAlert("error", data.message || "Gagal memperbarui profil.");
      }

    } catch (err) {
      console.error("❌ ERROR UPDATE PROFILE:", err);
      showAlert("error", "Terjadi kesalahan pada server.");
    }
  });
});

// ===============================
//  TOGGLE USERNAME & PASSWORD
// ===============================
function toggleUsernameEdit() {
  const input = document.getElementById("usernameEdit");
  if (input) input.classList.toggle("hidden");
}

function togglePwd(id, button) {
    const input = document.getElementById(id);
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bx bx-hide text-xl'; // Ikon mata tertutup (Hide)
    } else {
        input.type = 'password';
        icon.className = 'bx bx-show text-xl'; // Ikon mata terbuka (Show)
    }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  const preview = document.getElementById("profilePreview");
  const fileNameEl = document.getElementById("fileName");

  if (!file) {
    fileNameEl.textContent = "";
    return;
  }

  fileNameEl.textContent = file.name;

  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.src = ev.target.result;
    preview.classList.add("loaded");
  };
  reader.readAsDataURL(file);
}
