import { app, BrowserWindow } from 'electron';
import {startServer} from '@/main/server'; // 引入你的 Hono 应用
import path from 'node:path';
import windowStateKeeper from 'electron-window-state';

startServer();

app.whenReady().then(() => {
  const windowState = windowStateKeeper({
    defaultWidth: 800,
    defaultHeight: 600
  });
  const win = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // 简化开发，生产环境建议开启

      webSecurity: false,
    },
  });
  windowState.manage(win); // 让窗口记住上次的位置和大小

   if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    win.loadFile(indexPath);
  }

  console.log(process.env.VITE_DEV_SERVER_URL);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
