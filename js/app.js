// app.js — Bootstrap and event wiring

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initDB();
    navigate("today");

    // Register SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  } catch (err) {
    console.error("Init error:", err);
    document.getElementById("main-content").innerHTML = `<div class="error-state">Failed to start: ${err.message}</div>`;
  }
});

// Bottom nav
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    const screen = item.dataset.screen;
    _screenStack = [];
    navigate(screen);
  });
});

// Modal close buttons
document.getElementById("close-picker").addEventListener("click", () => closeAllModals());
document.getElementById("close-tag").addEventListener("click", () => closeAllModals());
document.getElementById("close-detail").addEventListener("click", () => closeAllModals());

// Close modal on backdrop click
document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeAllModals();
  });
});

// Camera button
document.getElementById("btn-camera").addEventListener("click", () => {
  document.getElementById("file-camera").click();
});

// Library button
document.getElementById("btn-library").addEventListener("click", () => {
  document.getElementById("file-library").click();
});
