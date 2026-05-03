import { z } from 'zod';
import { StateCreator } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GlobalState } from '../Schema';

// 用于加速操作：在端口中查找所有连接的边的id，无需遍历所有已存在的边

export const Deputy_Edge_Schema = z.object({
    id: z.string(),
})

export type Deputy_Edge = z.infer<typeof Deputy_Edge_Schema>
export interface Slice_Edges_Array_In_Port {
    sliceEdgesArrayInPort: 
        Record<string, Deputy_Edge[]> // 在 TypeScript 中，Deputy_Edge[] 和 Array<Deputy_Edge> 在功能、性能和类型检查上完全没有任何区别。
}

export const createSlice_Edges_Array_In_Port: StateCreator<
    GlobalState, // 欲创建的最终状态的类型接口
    [['zustand/immer', never]], // 中间件类型元组，告诉ts再用immer
    [],
    Slice_Edges_Array_In_Port
    > = (set, get) =>
({
    sliceEdgesArrayInPort: {}

})