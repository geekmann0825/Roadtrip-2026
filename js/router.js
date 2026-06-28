// router.js — Screen management and navigation

let _currentScreen = "today";
let _screenStack = [];

function navigate(screen, params = {}) {
  _currentScreen = screen;
  _screenStack.push({ screen, params });
  renderScreen(screen, params);
  updateNav(screen);
  window.scrollTo(0, 0);
}

function navigateBack() {
  _screenStack.pop();
  if (_screenStack.length > 0) {
    const prev = _screenStack[_screenStack.length - 1];
    renderScreen(prev.screen, prev.params);
    updateNav(prev.screen);
  } else {
    navigate("today");
  }
}

function updateNav(screen) {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.screen === screen);
  });
}

function refreshCurrentScreen() {
  const cur = _screenStack.length ? _screenStack[_screenStack.length - 1] : { screen: "today", params: {} };
  renderScreen(cur.screen, cur.params);
}

async function renderScreen(screen, params = {}) {
  const main = document.getElementById("main-content");
  main.innerHTML = `<div class="loading">Loading…</div>`;
  switch (screen) {
    case "today": main.innerHTML = await renderToday(); break;
    case "timeline": main.innerHTML = await renderTimeline(); break;
    case "stops": main.innerHTML = await renderStops(params); break;
    case "gallery": main.innerHTML = await renderGallery(params); break;
    case "backup": main.innerHTML = renderBackup(); break;
    case "day-detail": main.innerHTML = await renderDayDetail(params.dayId); break;
    case "stop-detail": main.innerHTML = await renderStopDetail(params.stopId); break;
    default: main.innerHTML = await renderToday();
  }
}

// ─── TODAY ────────────────────────────────────────────────────────────────────

async function renderToday() {
  const day = getTodayTripDay();
  const photos = await getPhotosByDay(day.id);
  const favs = photos.filter(p => p.isFavorite);
  const recent = [...photos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const today = new Date().toISOString().split("T")[0];
  const isToday = day.date === today;

  return `
    <div class="screen-today">
      <div class="today-header">
        <div class="today-eyebrow">${isToday ? "TODAY" : "UPCOMING"} · DAY ${day.day}</div>
        <h1 class="today-title">${escHtml(day.label)}</h1>
        <div class="today-date">${formatDate(day.date)} · ${escHtml(day.city)}</div>
        <div class="chip-group today-stops">
          ${day.stops.map(s => `<span class="chip chip-sm">${STOP_TYPE_ICONS[s.type] || "📍"} ${escHtml(s.name)}</span>`).join("")}
        </div>
      </div>

      <button class="btn-add-photo" onclick="openPhotoPicker({dayId:'${day.id}'})">
        <span class="btn-add-icon">📷</span>
        <span>Add Photo</span>
      </button>

      <div class="today-stops-list">
        ${day.stops.map(s => `
          <div class="stop-card-sm" onclick="navigate('stop-detail',{stopId:'${s.id}'})">
            <span class="stop-icon">${STOP_TYPE_ICONS[s.type] || "📍"}</span>
            <span class="stop-name">${escHtml(s.name)}</span>
            <button class="stop-add-btn" onclick="event.stopPropagation();openPhotoPicker({dayId:'${day.id}',stopId:'${s.id}'})">+ Photo</button>
          </div>
        `).join("")}
      </div>

      ${recent.length ? `
        <div class="section-header">
          <h2>Today's Photos <span class="count">${photos.length}</span></h2>
          ${photos.length > 8 ? `<button class="link-btn" onclick="navigate('gallery',{filterDay:'${day.id}'})">See all</button>` : ""}
        </div>
        <div class="photo-grid">
          ${recent.map(p => photoThumb(p)).join("")}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">📷</div>
          <p>No photos yet for today.<br>Tap the button above to add the first one!</p>
        </div>
      `}

      ${favs.length ? `
        <div class="section-header"><h2>⭐ Favorites</h2></div>
        <div class="photo-grid">${favs.map(p => photoThumb(p)).join("")}</div>
      ` : ""}
    </div>
  `;
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

async function renderTimeline() {
  const allPhotos = await getCachedPhotos();
  const byDay = groupBy(allPhotos, "dayId");

  const html = TRIP_STOPS.map(day => {
    const photos = byDay[day.id] || [];
    const cover = photos.find(p => p.isFavorite) || photos[0];
    return `
      <div class="timeline-day" onclick="navigate('day-detail',{dayId:'${day.id}'})">
        ${cover ? `<img class="timeline-cover" src="${cover.thumbnailDataUrl}" alt="">` : `<div class="timeline-cover-empty"><span>${day.stops[0] ? (STOP_TYPE_ICONS[day.stops[0].type] || "📅") : "📅"}</span></div>`}
        <div class="timeline-day-info">
          <div class="timeline-day-num">Day ${day.day} · ${formatDate(day.date)}</div>
          <div class="timeline-day-label">${escHtml(day.label)}</div>
          <div class="timeline-day-city">${escHtml(day.city)}</div>
          <div class="chip-group timeline-chips">
            ${day.stops.map(s => `<span class="chip chip-xs">${STOP_TYPE_ICONS[s.type] || "📍"} ${escHtml(s.name)}</span>`).join("")}
          </div>
          <div class="timeline-photo-count">${photos.length} photo${photos.length !== 1 ? "s" : ""}</div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="screen-timeline">
      <div class="screen-title-bar"><h1>Timeline</h1></div>
      <div class="timeline-list">${html}</div>
    </div>
  `;
}

// ─── DAY DETAIL ───────────────────────────────────────────────────────────────

async function renderDayDetail(dayId) {
  const day = getDayById(dayId);
  if (!day) return "<p>Day not found.</p>";
  const photos = await getPhotosByDay(dayId);
  const byStop = groupBy(photos, "stopId");

  let html = `
    <div class="screen-detail">
      <div class="detail-header">
        <button class="back-btn" onclick="navigateBack()">← Back</button>
        <div class="detail-eyebrow">Day ${day.day} · ${formatDate(day.date)}</div>
        <h1>${escHtml(day.label)}</h1>
        <div class="detail-city">${escHtml(day.city)}</div>
      </div>
      <button class="btn-add-photo btn-add-photo-sm" onclick="openPhotoPicker({dayId:'${day.id}'})">📷 Add Photo to Day ${day.day}</button>
  `;

  // Photos with no stop
  const noStop = byStop[""] || byStop["undefined"] || [];

  for (const stop of day.stops) {
    const stopPhotos = byStop[stop.id] || [];
    html += `
      <div class="stop-section">
        <div class="stop-section-header" onclick="navigate('stop-detail',{stopId:'${stop.id}'})">
          <span class="stop-icon-lg">${STOP_TYPE_ICONS[stop.type] || "📍"}</span>
          <div>
            <div class="stop-section-name">${escHtml(stop.name)}</div>
            <div class="stop-section-count">${stopPhotos.length} photo${stopPhotos.length !== 1 ? "s" : ""}</div>
          </div>
          <button class="stop-add-btn" onclick="event.stopPropagation();openPhotoPicker({dayId:'${day.id}',stopId:'${stop.id}'})">+ Photo</button>
        </div>
        ${stopPhotos.length ? `<div class="photo-grid photo-grid-sm">${stopPhotos.map(p => photoThumb(p)).join("")}</div>` : `<p class="stop-empty">No photos yet — tap + Photo to add</p>`}
      </div>
    `;
  }

  if (noStop.length) {
    html += `
      <div class="stop-section">
        <div class="stop-section-header">
          <span class="stop-icon-lg">📸</span>
          <div><div class="stop-section-name">Unassigned</div></div>
        </div>
        <div class="photo-grid photo-grid-sm">${noStop.map(p => photoThumb(p)).join("")}</div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

// ─── STOPS ────────────────────────────────────────────────────────────────────

async function renderStops(params = {}) {
  const allPhotos = await getCachedPhotos();
  const byStop = groupBy(allPhotos, "stopId");
  const filter = params.filter || "all";
  const allStops = getAllStops();
  const types = [...new Set(allStops.map(s => s.type))];

  const filtered = filter === "all" ? allStops : allStops.filter(s => s.type === filter);

  const filterHtml = `
    <div class="filter-chips">
      <button class="chip ${filter === "all" ? "chip-active" : ""}" onclick="navigate('stops',{filter:'all'})">All</button>
      ${types.map(t => `<button class="chip ${filter === t ? "chip-active" : ""}" onclick="navigate('stops',{filter:'${t}'})">${STOP_TYPE_ICONS[t] || "📍"} ${t.replace("-", " ")}</button>`).join("")}
    </div>
  `;

  const stopsHtml = filtered.map(s => {
    const count = (byStop[s.id] || []).length;
    const cover = (byStop[s.id] || []).find(p => p.isFavorite) || (byStop[s.id] || [])[0];
    return `
      <div class="stop-card" onclick="navigate('stop-detail',{stopId:'${s.id}'})">
        ${cover ? `<img class="stop-card-thumb" src="${cover.thumbnailDataUrl}" alt="">` : `<div class="stop-card-thumb stop-card-empty"><span>${STOP_TYPE_ICONS[s.type] || "📍"}</span></div>`}
        <div class="stop-card-info">
          <div class="stop-card-type">${STOP_TYPE_ICONS[s.type] || "📍"} ${s.type.replace("-", " ")}</div>
          <div class="stop-card-name">${escHtml(s.name)}</div>
          <div class="stop-card-meta">Day ${s.day} · ${escHtml(s.city)}</div>
          <div class="stop-card-count">${count} photo${count !== 1 ? "s" : ""}</div>
        </div>
        <button class="stop-add-btn" onclick="event.stopPropagation();openPhotoPicker({dayId:'${s.dayId}',stopId:'${s.id}'})">📷</button>
      </div>
    `;
  }).join("");

  return `
    <div class="screen-stops">
      <div class="screen-title-bar"><h1>Stops</h1></div>
      ${filterHtml}
      <div class="stops-list">${stopsHtml}</div>
    </div>
  `;
}

// ─── STOP DETAIL ──────────────────────────────────────────────────────────────

async function renderStopDetail(stopId) {
  const stop = getStopById(stopId);
  if (!stop) return "<p>Stop not found.</p>";
  const photos = await getPhotosByStop(stopId);
  const day = getDayById(stop.dayId);

  return `
    <div class="screen-detail">
      <div class="detail-header">
        <button class="back-btn" onclick="navigateBack()">← Back</button>
        <div class="detail-eyebrow">${STOP_TYPE_ICONS[stop.type] || "📍"} ${stop.type.replace("-", " ")} · Day ${stop.day}</div>
        <h1>${escHtml(stop.name)}</h1>
        <div class="detail-city">${escHtml(stop.city)} · ${formatDate(stop.date)}</div>
      </div>
      <button class="btn-add-photo btn-add-photo-sm" onclick="openPhotoPicker({dayId:'${stop.dayId}',stopId:'${stop.id}'})">📷 Add Photo Here</button>
      ${photos.length ? `
        <div class="section-header"><h2>${photos.length} Photo${photos.length !== 1 ? "s" : ""}</h2></div>
        <div class="photo-grid">${photos.map(p => photoThumb(p)).join("")}</div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">${STOP_TYPE_ICONS[stop.type] || "📍"}</div>
          <p>No photos yet for ${escHtml(stop.name)}.<br>Tap the button above to add some!</p>
        </div>
      `}
    </div>
  `;
}

// ─── GALLERY ─────────────────────────────────────────────────────────────────

async function renderGallery(params = {}) {
  let photos = await getCachedPhotos();
  const view = params.view || "all";
  const search = params.search || "";

  // Apply filters
  if (params.filterDay) photos = photos.filter(p => p.dayId === params.filterDay);
  if (params.filterStop) photos = photos.filter(p => p.stopId === params.filterStop);
  if (params.filterTag) photos = photos.filter(p => p.tags.includes(params.filterTag));
  if (params.filterPerson) photos = photos.filter(p => p.people.includes(params.filterPerson));
  if (view === "favorites") photos = photos.filter(p => p.isFavorite);

  if (search) {
    const q = search.toLowerCase();
    photos = photos.filter(p =>
      p.caption.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)) ||
      p.people.some(t => t.toLowerCase().includes(q)) ||
      (getDayById(p.dayId)?.city || "").toLowerCase().includes(q) ||
      (getStopById(p.stopId)?.name || "").toLowerCase().includes(q)
    );
  }

  photos = photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const views = [
    { id: "all", label: "All" },
    { id: "favorites", label: "⭐ Favs" }
  ];

  const allPeople = [...new Set((await getCachedPhotos()).flatMap(p => p.people))];
  const allTags = [...new Set((await getCachedPhotos()).flatMap(p => p.tags))];

  return `
    <div class="screen-gallery">
      <div class="screen-title-bar">
        <h1>Gallery</h1>
        <span class="count">${photos.length}</span>
      </div>
      <div class="gallery-search-wrap">
        <input class="gallery-search" type="search" placeholder="Search captions, tags, places…" value="${escHtml(search)}"
          oninput="debounce(() => navigate('gallery', {...${JSON.stringify(params)}, search: this.value}), 300)()">
      </div>
      <div class="filter-chips">
        ${views.map(v => `<button class="chip ${view === v.id ? "chip-active" : ""}" onclick="navigate('gallery',{view:'${v.id}'})">${v.label}</button>`).join("")}
        ${TRIP_STOPS.map(d => `<button class="chip chip-xs ${params.filterDay === d.id ? "chip-active" : ""}" onclick="navigate('gallery',{filterDay:'${d.id}'})">Day ${d.day}</button>`).join("")}
        ${allPeople.map(p => `<button class="chip chip-xs ${params.filterPerson === p ? "chip-active" : ""}" onclick="navigate('gallery',{filterPerson:'${p}'})">${escHtml(p)}</button>`).join("")}
      </div>
      ${photos.length ? `<div class="photo-grid photo-grid-masonry">${photos.map(p => photoThumb(p, true)).join("")}</div>`
        : `<div class="empty-state"><div class="empty-icon">🔍</div><p>No photos match your filter.</p><button class="btn btn-secondary" onclick="navigate('gallery')">Clear filters</button></div>`}
    </div>
  `;
}

// ─── BACKUP ───────────────────────────────────────────────────────────────────

function renderBackup() {
  return `
    <div class="screen-backup">
      <div class="screen-title-bar"><h1>Backup</h1></div>
      <div class="backup-section">
        <h2>Export</h2>
        <p class="muted">Download a full backup including all photos and trip data.</p>
        <button class="btn btn-primary" onclick="exportBackup()">📤 Export Full Backup</button>
        <button class="btn btn-secondary" onclick="exportMetadataOnly()">📋 Export Metadata Only</button>
      </div>
      <div class="backup-section">
        <h2>Import</h2>
        <p class="muted">Restore from a previous backup. Photos will be added to existing data.</p>
        <button class="btn btn-primary" onclick="importBackup()">📥 Import Backup</button>
      </div>
      <div class="backup-section backup-danger">
        <h2>Danger Zone</h2>
        <p class="muted">Permanently delete all photos and data. Export first!</p>
        <button class="btn btn-danger" onclick="clearData()">🗑️ Clear All Data</button>
      </div>
    </div>
  `;
}

// ─── Shared photo thumbnail ───────────────────────────────────────────────────

function photoThumb(photo, showCaption = false) {
  return `
    <div class="photo-thumb" onclick="openPhotoDetail('${photo.id}')">
      <img src="${photo.thumbnailDataUrl}" alt="${escHtml(photo.caption)}" loading="lazy">
      ${photo.isFavorite ? `<span class="photo-fav-badge">⭐</span>` : ""}
      ${showCaption && photo.caption ? `<div class="photo-caption-overlay">${escHtml(photo.caption)}</div>` : ""}
    </div>
  `;
}