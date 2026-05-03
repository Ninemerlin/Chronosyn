import { serve } from '@hono/node-server'

import app from '@/main/app'

export const startServer = () => {
  serve({
    fetch: app.fetch,

    hostname: "127.0.0.1",
    port: 3000 // Hono 运行在 3000 端口
  }, (info) => {
  console.log(`Hono server is actually listening on http://${info.address}:${info.port}`);
  })
};
