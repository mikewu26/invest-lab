"use client";
import { useCallback, useSyncExternalStore } from "react";
import { localStore } from "./local";
import { DEFAULT_DATA, type UserData } from "./types";

const store = localStore;

/** 讀寫使用者資料。伺服器端渲染時回傳預設值，載入後換成瀏覽器裡存的資料。 */
export function useUserData() {
  const data = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.load(),
    () => DEFAULT_DATA,
  );
  const update = useCallback((fn: (d: UserData) => UserData) => store.save(fn(store.load())), []);
  return [data, update] as const;
}

export function exportJson(data: UserData) {
  return JSON.stringify(data, null, 2);
}

export function importJson(text: string): UserData {
  const parsed = JSON.parse(text) as UserData;
  if (parsed?.version !== 1 || !Array.isArray(parsed.holdings) || !parsed.plan) {
    throw new Error("檔案格式不符，請選擇從本工具匯出的 JSON 檔");
  }
  return parsed;
}
