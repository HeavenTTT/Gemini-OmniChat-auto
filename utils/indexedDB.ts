/**
 * 客户端 IndexedDB 数据持久化服务类
 * 用于代替 localStorage，解决 5MB 容量限制，并提供无缝的 localStorage 数据迁移功能。
 */

// 数据库常量配置
const DB_NAME = 'OmniChatDB';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

/**
 * 初始化并打开 IndexedDB 数据库
 * @returns Promise<IDBDatabase>
 */
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * 异步写入数据到 IndexedDB
 * @param key 数据的键名
 * @param value 数据的任意值类型
 */
export const dbSetItem = async (key: string, value: any): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to set item in IndexedDB (key: ${key}):`, error);
  }
};

/**
 * 异步从 IndexedDB 中获取数据
 * 如果 IndexedDB 中没有，但 localStorage 中有该数据，将自动把数据迁移并保存至 IndexedDB
 * @param key 数据的键名
 * @param fallback 默认兜底值
 */
export const dbGetItem = async <T>(key: string, fallback: T | null = null): Promise<T | null> => {
  try {
    const db = await getDB();
    const dbValue = await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (dbValue !== undefined) {
      return dbValue;
    }

    // 无缝迁移逻辑：如果 IndexedDB 中不存在此数据，尝试从 localStorage 读取
    const localStr = localStorage.getItem(key);
    if (localStr !== null) {
      try {
        const parsed = JSON.parse(localStr);
        // 将迁移出来的数据写入 IndexedDB 缓存
        await dbSetItem(key, parsed);
        // 在迁移成功后，清理 localStorage
        localStorage.removeItem(key);
        console.log(`Successfully migrated key "${key}" from localStorage to IndexedDB.`);
        return parsed as T;
      } catch (e) {
        // 如果不是 JSON 格式，直接返回原始字符串
        await dbSetItem(key, localStr);
        localStorage.removeItem(key);
        console.log(`Successfully migrated raw key "${key}" from localStorage to IndexedDB.`);
        return localStr as unknown as T;
      }
    }

    return fallback;
  } catch (error) {
    console.error(`Failed to get item from IndexedDB (key: ${key}):`, error);
    // 降级使用 localStorage 兜底
    const localStr = localStorage.getItem(key);
    if (localStr !== null) {
      try {
        return JSON.parse(localStr) as T;
      } catch (e) {
        return localStr as unknown as T;
      }
    }
    return fallback;
  }
};