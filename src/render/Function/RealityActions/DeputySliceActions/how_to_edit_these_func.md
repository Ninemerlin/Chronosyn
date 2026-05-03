immer中间件给zustand做proxy，提供了draft这样一个草稿状态。
操作draft能够提供UI渲染层面的原子性：immer改过的set函数是UI原子的——set完全执行完毕，生成新的不可变状态，才会通知react更新。
但是，set函数不是事务：
1. 安全：set中断，已改过的draft不会回滚，但这不会影响state——这个时候可以看作是事务
2. 不安全：如果set做了副操作，那也同样无法回滚。必须做好预防

F层由于跟react毫无关系，访问状态都是zustand的vanilla模式
写必须使用draft：useStore.setState((draft) => {})
读必须使用state：useStore.getState()
只有在P层，使用：useStore((state) => )

每个副slice维护函数文件大致只需要两组函数：
1. 构建函数和析函数
2. 查询函数