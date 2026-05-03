// 这里是后端的主路由，扩展route.ts的定义，补全具体的业务逻辑
// 同时，这也是route.ts的实例，提供给server.ts使用。

import { cors } from 'hono/cors'
import { Hono } from 'hono'

const app = new Hono();

app.use('/*', cors());

// 实现真正的逻辑，匹配route.ts里定义的路由签名
app.get('/', (c) => {
  return c.text('Hello Hono + Biome + TS!');
})

app.get('/api/hello', (c) => {
  // 这里写复杂的后端逻辑
  return c.json({ message: '这是来自后端的真实数据！' })
})

app.get('/api/user/:id', (c) => {
  const id = c.req.param('id')
  // 比如从本地文件读取用户信息
  return c.json({ id, name: '张三', age: 25 })
})

// 导出真正的实例，供server.ts使用
export default app;
