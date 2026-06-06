// electron/preload.ts
import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("pegasus", {
  platform: process.platform,
  desktop: true
});
