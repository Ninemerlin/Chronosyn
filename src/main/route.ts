// 为了解决App.tsx必须获得后端类型以开启rpc，但是tsconfig.node.json
// 又绝不可能include后端文件的问题（防打包）
// 所以，需要将后端划分为基础（路由）和后端。

// route.ts就是基础路由，定义接口的类型（路径，方法，参数类型）
// 绝不包含fs，数据库，复杂node插件等：这个文件会被前端引用（AppType类型）
// 实际上，server.ts引入的hono实例是app.ts而不是本route.ts的实例——这可以防止路由从本实例过早返回。
// 只需要注意，app.ts的实例的路由的签名要与route.ts的定义一致就行了。

import { Hono } from 'hono'

const app = new Hono();

const route = app.get('/', (c) => {
  return c.text('Hello Hono + Biome + TS!');
})
.get('/api/hello', (c) => {
  return c.json({ message: '' });
});

export type AppType = typeof route;
// export default app;
