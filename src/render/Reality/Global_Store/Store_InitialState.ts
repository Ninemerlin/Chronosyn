/*
初次启动时的系统状态，软件第一个快照，也是每次运行时未恢复的默认快照。
虽然位于Reality文件夹内，但由于真理唯一性，这玩意直接定义了最初所有可用数据的样子。
- 是的，就是所有。一方面，这能避免重复定义类型，另一方面，源代码自己有实例化代码，本身也是一种类型展示
- （用上的都最开始实例化甚至自动搞个注释把类型写进去就行了）
保存和读取的逻辑位于F，保存的存档文件位于E，存档逻辑结构位于R_schema.tsx内——存档不过是完整state的序列化
由于slice切片要求必须具备初始值，本文件会被多次引用。
所以本文件也算个中心了，编码规则在这里写了。
类型_
*/

import type { IdeMeta } from "./Schema_Slices_WithLogic/Meta_Slice"

// 定义接口，ide类型推断辅助就能生效。你ts的完善性足以在你在手动改错了但ide还没反应时意识到什么
export interface GlobalSnapshotType {
    metas: Record<string, IdeMeta>;
    //layouts: Record<string, IdeLayout>;
}
// IDE首次进入。除了示例组件应该只有ide结构相关的元素被定义。
export const DEFAULT_SNAPSHOT: GlobalSnapshotType = { 
    metas: {
        'manual-meta-id-example': {
            id: 'manual-meta-id-example',
            name: 'theBaseRectContainerOfIde',
            parentId: null,
            description: "quick description",
            tags: [],
        } ,
    },
}
