// db.js — IndexedDB wrapper

const DB_NAME = "roadtrip2026";
const DB_VERSION = 1;
let db = null;

async function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains("photos")) {
        const ps = d.createObjectStore("photos", { keyPath: "id" });
        ps.createIndex("dayId", "dayId", { unique: false });
        ps.createIndex("stopId", "stopId", { unique: false });
        ps.createIndex("isFavorite", "isFavorite", { unique: false });
        ps.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!d.objectStoreNames.contains("settings")) {
        d.createObjectStore("settings", { keyPath: "key" });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function getDB() {
  if (!db) throw new Error("DB not initialized");
  return db;
}

function txStore(storeName, mode = "readonly") {
  const tx = getDB().transaction(storeName, mode);
  return tx.objectStore(storeName);
}

async function savePhoto(photo) {
  return new Promise((resolve, reject) => {
    const store = txStore("photos", "readwrite");
    const req = store.put(photo);
    req.onsuccess = () => resolve(photo);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getAllPhotos() {
  return new Promise((resolve, reject) => {
    const store = txStore("photos");
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getPhotoById(id) {
  return new Promise((resolve, reject) => {
    const store = txStore("photos");
    const req = store.get(id);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getPhotosByDay(dayId) {
  return new Promise((resolve, reject) => {
    const store = txStore("photos");
    const idx = store.index("dayId");
    const req = idx.getAll(dayId);
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getPhotosByStop(stopId) {
  return new Promise((resolve, reject) => {
    const store = txStore("photos");
    const idx = store.index("stopId");
    const req = idx.getAll(stopId);
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function updatePhoto(photo) {
  return savePhoto(photo);
}

async function deletePhoto(photoId) {
  return new Promise((resolve, reject) => {
    const store = txStore("photos", "readwrite");
    const req = store.delete(photoId);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

async function clearAllData() {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(["photos", "settings"], "readwrite");
    tx.objectStore("photos").clear();
    tx.objectStore("settings").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getSetting(key) {
  return new Promise((resolve, reject) => {
    const store = txStore("settings");
    const req = store.get(key);
    req.onsuccess = (e) => resolve(e.target.result ? e.target.result.value : null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    const store = txStore("settings", "readwrite");
    const req = store.put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}
