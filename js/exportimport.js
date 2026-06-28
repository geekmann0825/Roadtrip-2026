// exportImport.js — Backup and restore

async function exportBackup() {
  const photos = await getAllPhotos();
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tripStops: TRIP_STOPS,
    photos
  };
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `roadtrip-2026-photo-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${photos.length} photos`, "success");
}

async function exportMetadataOnly() {
  const photos = await getAllPhotos();
  const meta = photos.map(({ imageDataUrl, thumbnailDataUrl, ...rest }) => rest);
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    metadataOnly: true,
    tripStops: TRIP_STOPS,
    photos: meta
  };
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `roadtrip-2026-metadata-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported metadata for ${photos.length} photos`, "success");
}

function importBackup() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload.photos || !Array.isArray(payload.photos)) {
        showToast("Invalid backup file", "error");
        return;
      }
      const count = payload.photos.length;
      if (!confirm(`Import ${count} photos from backup dated ${payload.exportedAt ? new Date(payload.exportedAt).toLocaleDateString() : "unknown"}?\n\nThis will ADD to your existing photos.`)) return;

      let imported = 0;
      for (const photo of payload.photos) {
        await savePhoto(photo);
        imported++;
      }
      invalidateCache();
      showToast(`Imported ${imported} photos!`, "success");
      refreshCurrentScreen();
    } catch (err) {
      showToast("Failed to import: " + err.message, "error");
    }
  };
  input.click();
}

async function clearData() {
  const photos = await getAllPhotos();
  if (!confirm(`Delete ALL ${photos.length} photos and data?\n\nThis cannot be undone. Consider exporting a backup first.`)) return;
  await clearAllData();
  invalidateCache();
  showToast("All data cleared", "info");
  refreshCurrentScreen();
}
