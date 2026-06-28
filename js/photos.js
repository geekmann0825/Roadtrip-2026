// photos.js — Photo workflow: pick, tag, save, edit, delete

let _photoPickerContext = null; // { dayId, stopId } if opened from a stop
let _editPhotoId = null;
let _allPhotosCache = null;

function invalidateCache() { _allPhotosCache = null; }

async function getCachedPhotos() {
  if (!_allPhotosCache) _allPhotosCache = await getAllPhotos();
  return _allPhotosCache;
}

// ─── Open Photo Picker ────────────────────────────────────────────────────────

function openPhotoPicker(context = {}) {
  _photoPickerContext = context;
  document.getElementById("file-camera").value = "";
  document.getElementById("file-library").value = "";
  showModal("modal-picker");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("file-camera").addEventListener("change", (e) => {
    if (e.target.files.length) handleFiles(Array.from(e.target.files));
  });
  document.getElementById("file-library").addEventListener("change", (e) => {
    if (e.target.files.length) handleFiles(Array.from(e.target.files));
  });
});

async function handleFiles(files) {
  hideModal("modal-picker");
  if (files.length === 1) {
    await openTagEditor(files[0], _photoPickerContext);
  } else {
    // Batch: tag all with same day/stop, open one form
    await openBatchTagEditor(files, _photoPickerContext);
  }
}

// ─── Tag Editor (single) ──────────────────────────────────────────────────────

async function openTagEditor(file, context = {}) {
  showModal("modal-tag");
  document.getElementById("tag-form-status").textContent = "Processing image…";

  const [imageDataUrl, thumbnailDataUrl] = await Promise.all([
    resizeImage(file),
    createThumbnail(file)
  ]);

  document.getElementById("tag-preview-img").src = thumbnailDataUrl;
  document.getElementById("tag-form-status").textContent = "";

  const draft = {
    id: crypto.randomUUID(),
    imageDataUrl,
    thumbnailDataUrl,
    createdAt: new Date().toISOString(),
    dateTaken: new Date().toISOString().split("T")[0],
    dayId: context.dayId || getTodayTripDay().id,
    stopId: context.stopId || "",
    category: context.category || "",
    title: "",
    caption: "",
    people: [],
    tags: [],
    isFavorite: false
  };

  renderTagForm(draft);
  document.getElementById("tag-save-btn").onclick = async () => {
    const filled = collectTagForm(draft);
    await savePhoto(filled);
    invalidateCache();
    hideModal("modal-tag");
    showToast("Photo saved!", "success");
    if (window._afterSave) { window._afterSave(); window._afterSave = null; }
    else refreshCurrentScreen();
  };
}

// ─── Batch Tag Editor ─────────────────────────────────────────────────────────

async function openBatchTagEditor(files, context = {}) {
  showModal("modal-tag");
  document.getElementById("tag-form-status").textContent = `Processing ${files.length} images…`;

  const processed = await Promise.all(files.map(async f => ({
    id: crypto.randomUUID(),
    imageDataUrl: await resizeImage(f),
    thumbnailDataUrl: await createThumbnail(f),
    createdAt: new Date().toISOString(),
    dateTaken: new Date().toISOString().split("T")[0],
    dayId: context.dayId || getTodayTripDay().id,
    stopId: context.stopId || "",
    category: context.category || "",
    title: "",
    caption: "",
    people: [],
    tags: [],
    isFavorite: false
  })));

  document.getElementById("tag-preview-img").src = processed[0].thumbnailDataUrl;
  document.getElementById("tag-form-status").textContent = `Tagging ${files.length} photos — tags apply to all`;

  renderTagForm(processed[0]);
  document.getElementById("tag-save-btn").onclick = async () => {
    const formData = collectTagForm(processed[0]);
    for (const p of processed) {
      await savePhoto({ ...p, dayId: formData.dayId, stopId: formData.stopId, category: formData.category, caption: formData.caption, people: [...formData.people], tags: [...formData.tags], isFavorite: formData.isFavorite });
    }
    invalidateCache();
    hideModal("modal-tag");
    showToast(`${files.length} photos saved!`, "success");
    refreshCurrentScreen();
  };
}

// ─── Tag Form Render ──────────────────────────────────────────────────────────

function renderTagForm(draft) {
  const container = document.getElementById("tag-form-fields");
  const today = getTodayTripDay();

  // Build day options
  const dayOptions = TRIP_STOPS.map(d =>
    `<option value="${d.id}" ${(draft.dayId || today.id) === d.id ? "selected" : ""}>Day ${d.day} — ${d.city}</option>`
  ).join("");

  // Build stop options for selected day
  const selectedDay = getDayById(draft.dayId || today.id);
  const stopOptions = buildStopOptions(selectedDay, draft.stopId);

  container.innerHTML = `
    <div class="form-group">
      <label>Day</label>
      <select id="tf-day">${dayOptions}</select>
    </div>
    <div class="form-group">
      <label>Stop</label>
      <select id="tf-stop">${stopOptions}</select>
    </div>
    <div class="form-group">
      <label>Caption</label>
      <textarea id="tf-caption" rows="2" placeholder="What's happening here?">${escHtml(draft.caption)}</textarea>
    </div>
    <div class="form-group">
      <label>People</label>
      <div class="chip-group" id="tf-people">
        ${PEOPLE.map(p => `<button class="chip ${draft.people.includes(p) ? "chip-active" : ""}" data-val="${p}" onclick="toggleChip(this,'tf-people')">${p}</button>`).join("")}
      </div>
    </div>
    <div class="form-group">
      <label>Quick Tags</label>
      <div class="chip-group" id="tf-tags">
        ${QUICK_TAGS.map(t => `<button class="chip ${draft.tags.includes(t) ? "chip-active" : ""}" data-val="${t}" onclick="toggleChip(this,'tf-tags')">${t}</button>`).join("")}
      </div>
    </div>
    <div class="form-group form-inline">
      <label>Favorite</label>
      <button class="fav-toggle ${draft.isFavorite ? "active" : ""}" id="tf-fav" onclick="this.classList.toggle('active')">⭐</button>
    </div>
  `;

  // When day changes, rebuild stop list
  document.getElementById("tf-day").addEventListener("change", (e) => {
    const day = getDayById(e.target.value);
    document.getElementById("tf-stop").innerHTML = buildStopOptions(day, "");
  });
}

function buildStopOptions(day, selectedStopId) {
  if (!day) return `<option value="">— no stop —</option>`;
  return `<option value="">— no stop —</option>` +
    day.stops.map(s => `<option value="${s.id}" ${s.id === selectedStopId ? "selected" : ""}>${STOP_TYPE_ICONS[s.type] || "📍"} ${s.name}</option>`).join("");
}

function toggleChip(btn, groupId) {
  btn.classList.toggle("chip-active");
}

function collectTagForm(base) {
  const dayId = document.getElementById("tf-day").value;
  const stopId = document.getElementById("tf-stop").value;
  const caption = document.getElementById("tf-caption").value.trim();
  const people = Array.from(document.querySelectorAll("#tf-people .chip-active")).map(b => b.dataset.val);
  const tags = Array.from(document.querySelectorAll("#tf-tags .chip-active")).map(b => b.dataset.val);
  const isFavorite = document.getElementById("tf-fav").classList.contains("active");
  const stop = stopId ? getStopById(stopId) : null;
  const category = stop ? stop.type : "";
  return { ...base, dayId, stopId, caption, people, tags, isFavorite, category };
}

// ─── Photo Detail / Edit ──────────────────────────────────────────────────────

async function openPhotoDetail(photoId) {
  const photo = await getPhotoById(photoId);
  if (!photo) return;
  _editPhotoId = photoId;

  const modal = document.getElementById("modal-detail");
  const day = getDayById(photo.dayId);
  const stop = photo.stopId ? getStopById(photo.stopId) : null;

  modal.querySelector(".modal-body").innerHTML = `
    <div class="detail-img-wrap">
      <img src="${photo.imageDataUrl}" class="detail-img" alt="">
      <button class="detail-fav ${photo.isFavorite ? "active" : ""}" onclick="toggleDetailFav('${photo.id}', this)">⭐</button>
    </div>
    <div class="detail-meta">
      <div class="detail-where">${day ? `Day ${day.day} — ${day.city}` : ""} ${stop ? `· ${stop.name}` : ""}</div>
      ${photo.caption ? `<p class="detail-caption">${escHtml(photo.caption)}</p>` : ""}
      ${photo.people.length ? `<div class="detail-chips">${photo.people.map(p => `<span class="chip chip-sm">${p}</span>`).join("")}</div>` : ""}
      ${photo.tags.length ? `<div class="detail-chips">${photo.tags.map(t => `<span class="chip chip-sm chip-tag">${t}</span>`).join("")}</div>` : ""}
      <div class="detail-date">${new Date(photo.createdAt).toLocaleDateString()}</div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-secondary" onclick="openEditPhoto('${photo.id}')">✏️ Edit</button>
      <button class="btn btn-danger" onclick="confirmDeletePhoto('${photo.id}')">🗑️ Delete</button>
    </div>
  `;
  showModal("modal-detail");
}

async function toggleDetailFav(id, btn) {
  const photo = await getPhotoById(id);
  photo.isFavorite = !photo.isFavorite;
  await updatePhoto(photo);
  invalidateCache();
  btn.classList.toggle("active", photo.isFavorite);
  showToast(photo.isFavorite ? "Added to favorites" : "Removed from favorites");
}

async function openEditPhoto(photoId) {
  const photo = await getPhotoById(photoId);
  if (!photo) return;
  hideModal("modal-detail");
  showModal("modal-tag");
  document.getElementById("tag-preview-img").src = photo.thumbnailDataUrl;
  document.getElementById("tag-form-status").textContent = "Editing photo";
  renderTagForm(photo);
  document.getElementById("tag-save-btn").onclick = async () => {
    const updated = collectTagForm(photo);
    await updatePhoto(updated);
    invalidateCache();
    hideModal("modal-tag");
    showToast("Photo updated!", "success");
    refreshCurrentScreen();
  };
}

async function confirmDeletePhoto(photoId) {
  if (!confirm("Delete this photo? This cannot be undone.")) return;
  await deletePhoto(photoId);
  invalidateCache();
  hideModal("modal-detail");
  showToast("Photo deleted", "info");
  refreshCurrentScreen();
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function showModal(id) {
  document.querySelectorAll(".modal").forEach(m => m.classList.remove("modal-open"));
  document.getElementById(id).classList.add("modal-open");
  document.body.classList.add("modal-active");
}

function hideModal(id) {
  document.getElementById(id).classList.remove("modal-open");
  document.body.classList.remove("modal-active");
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach(m => m.classList.remove("modal-open"));
  document.body.classList.remove("modal-active");
}