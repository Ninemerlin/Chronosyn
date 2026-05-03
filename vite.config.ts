import path from 'node:path';
import { execFileSync } from 'node:child_process';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';

const devPort = 8000;

function cleanupStaleVitePort(port: number) {
  if (process.platform !== 'win32') return;

  const psScript = `
    $connection = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) { return }

    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)"
    if (-not $process) { return }

    if ($process.Name -ne 'node.exe') { return }

    Stop-Process -Id $process.ProcessId -Force
  `;

  try {
    execFileSync('powershell', ['-NoProfile', '-Command', psScript], {
      stdio: 'ignore',
    });
  } catch {
    // Ignore cleanup failures and let Vite report the real bind error if needed.
  }
}

export default defineConfig(() => {
  const enableElectron = process.env.ELECTRON === 'true';

  cleanupStaleVitePort(devPort);

  return {
    root: path.resolve(__dirname, 'src/render'),
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(enableElectron
        ? [
            electron({
              main: {
                entry: path.resolve(__dirname, 'src/main/index.ts'),
                vite: {
                  build: {
                    outDir: path.resolve(__dirname, 'dist-electron'),
                  },
                },
              },
            }),
          ]
        : []),
    ],
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    server: {
      host: '127.0.0.1',
      port: devPort,
    },
  };
});
