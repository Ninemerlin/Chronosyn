/*
总装图纸。
由于只聚合和导出类型，任何分片可以引入它。
*/


import type { IdeAllLayoutSlice } from "./Schema_Slices_WithLogic/Layout_Slice";
import type { MetaSlice } from "./Schema_Slices_WithLogic/Meta_Slice";
import { UIStyleSlice } from "./Schema_Slices_WithLogic/UI_Style_Slice";

// 导出这个类型：
// 1. react无关的，zustand相关的工具函数，需要GlobalState作为入参类型
// 这类工具函数是只读的，严格禁止改变状态。
// 找出一个节点的所有子节点的 ID
// export const selectChildIds = (state: GlobalState, parentId: string) => {
// return Object.values(state.metas)
// .filter(m => m.parentId === parentId)
// .map(m => m.id);
// };
// 2. useStore本身就是GlobalState类型所定义————这意味着，你必须在任何一个使用usestore的地方
// （都在P，因为react组件才能具有这个Hook），都导入这个类型，否则state本身就会变成any
export type GlobalState = 
 // 使用&来组合其他部分的slice
MetaSlice & UIStyleSlice;

