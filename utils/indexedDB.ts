/**
 * IndexedDB 存储适配器
 * 提供比 LocalStorage 更大的容量 (50MB+ vs 5MB)，支持异步非阻塞读写，
 * 且完美支持复杂的结构化数据存储。在不可用时自动优雅降级到 LocalStorage。
 */

const DB_NAME = 'gemini-omnichat-db';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

/**
 * 初始化 IndexedDB 数据库
 * @returns {Promise<IDBDatabase>} 数据库连接
 */
export const initIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * 获取指定键的值
 * @template T
 * @param {string} key 键名
 * @param {T} fallback 默认回退值
 * @returns {Promise<T>} 存储的值
 */
export const getIndexedDBItem = <T>(key: string, fallback: T): Promise<T> => {
  return initIndexedDB()
    .then((db) => {
      return new Promise<T>((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          if (request.result !== undefined) {
            resolve(request.result as T);
          } else {
            resolve(fallback);
          }
        };
        request.onerror = () => {
          resolve(fallback);
        };
      });
    })
    .catch(() => {
      // 优雅降级：如果 IndexedDB 无法使用，回退到 LocalStorage
      try {
        const localVal = localStorage.getItem(key);
        if (localVal !== null) {
          return JSON.parse(localVal) as T;
        }
      } catch (e) {
        console.warn('LocalStorage read fallback failed:', e);
      }
      return fallback;
    });
};

/**
 * 存储指定键值对
 * @template T
 * @param {string} key 键名
 * @param {T} value 要存储的值
 * @returns {Promise<void>}
 */
export const setIndexedDBItem = <T>(key: string, value: T): Promise<void> => {
  return initIndexedDB()
    .then((db) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    })
    .catch((err) => {
      console.warn('IndexedDB write failed, falling back to LocalStorage', err);
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('LocalStorage backup write failed:', e);
      }
    });
};