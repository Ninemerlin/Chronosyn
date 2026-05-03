R (Reality) 层： * Store.ts 负责定义内存抽屉（Zustand + Immer）。
只读透镜函数但毕竟也是动作，所以没放在Reality
只读透镜读数据，做编排，爱返回什么返回什么。反正这堆函数和React毫无关系，只和zustand内的数据有关。

F (Function) 层：
ReadWriteActions导入 useStore.getState/setState，执行跨切片的增删改查逻辑（不依赖 React）。
因为zustand具有Hook和Vanilla两种模式。
hook只运行在React组件或者自定义hook，但vanilla可以运行在任何一个js函数里。
hook对返回的状态快照自动建立订阅关系，vanilla是只读快照（而且会过期）

P (Projection) 层：
React 组件导入 useStore 作为 Hook，精准订阅自己需要的那一点点数据，渲染 UI。