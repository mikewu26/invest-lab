"use client";
import { useCallback, useSyncExternalStore } from "react";
import { localStore } from "./local";
import { migrate } from "./migrate";
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("檔案不是有效的 JSON");
  }
  const v = (parsed as { version?: number })?.version;
  if (v !== 1 && v !== 2) throw new Error("檔案格式不符，請選擇從本工具匯出的 JSON 檔");
  return migrate(parsed);
}
