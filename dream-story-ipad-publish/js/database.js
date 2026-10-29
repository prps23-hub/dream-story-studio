// Dream Story Studio - Local Asset Database

const DB_NAME = "DreamStoryStudioDB";
const DB_VERSION = 1;

function openStudioDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("assets")) {
        const store = db.createObjectStore("assets", {
          keyPath: "id"
        });

        store.createIndex("projectId", "projectId", {
          unique: false
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function saveAsset(asset) {
  const db = await openStudioDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("assets", "readwrite");
    const store = transaction.objectStore("assets");

    store.put(asset);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getProjectAssets(projectId) {
  const db = await openStudioDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("assets", "readonly");
    const store = transaction.objectStore("assets");
    const index = store.index("projectId");

    const request = index.getAll(projectId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}


// Delete one asset from the local database.
async function deleteStudioAsset(assetId) {
  const db = await openStudioDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("assets", "readwrite");
    const store = transaction.objectStore("assets");

    store.delete(assetId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      const error = transaction.error;
      db.close();
      reject(error);
    };

    transaction.onabort = () => {
      const error = transaction.error;
      db.close();
      reject(error);
    };
  });
}
