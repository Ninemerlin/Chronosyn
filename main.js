const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

const CONTENT_DIR = path.join(__dirname, 'content');
const META_DIR = path.join(__dirname, 'metadata');

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const encodeMetaName = (relativePath) => {
  const encoded = encodeURIComponent(relativePath.split(path.sep).join('/'));
  return `${encoded}.md`;
};

const readMetadata = async (relativePath) => {
  const fileName = encodeMetaName(relativePath);
  const metaPath = path.join(META_DIR, fileName);
  try {
    return await fs.readFile(metaPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
};

const writeMetadata = async (relativePath, content) => {
  const fileName = encodeMetaName(relativePath);
  const metaPath = path.join(META_DIR, fileName);
  await fs.writeFile(metaPath, content, 'utf8');
};

const buildTree = async (dirPath, basePath = '') => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries) {
    const relativePath = path.join(basePath, entry.name);
    if (entry.isDirectory()) {
      const children = await buildTree(path.join(dirPath, entry.name), relativePath);
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        children,
        metadata: await readMetadata(relativePath)
      });
    } else {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
        metadata: await readMetadata(relativePath)
      });
    }
  }
  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
};

const prepareDirectories = async () => {
  await ensureDir(CONTENT_DIR);
  await ensureDir(META_DIR);
  if (!fsSync.existsSync(path.join(CONTENT_DIR, 'hello.txt'))) {
    await fs.writeFile(path.join(CONTENT_DIR, 'hello.txt'), 'Hello Chronosyn', 'utf8');
  }
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
};

ipcMain.handle('content:getTree', async () => {
  await prepareDirectories();
  return buildTree(CONTENT_DIR);
});

ipcMain.handle('content:saveMetadata', async (_event, payload) => {
  const { path: relativePath, metadata } = payload;
  await prepareDirectories();
  await writeMetadata(relativePath, metadata);
  return { ok: true };
});

app.whenReady().then(async () => {
  await prepareDirectories();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
