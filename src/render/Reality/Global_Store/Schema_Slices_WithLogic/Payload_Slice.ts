// 关于runtimeslice和payloadslice
// 组件的一个属性可以放在payload的大型object中，也可以放在runtime slice中。
// 唯一的标准是：该属性是否需要序列化。

import { StateCreator } from "zustand";
import { z } from "zod";
import type { GlobalState } from "../Schema";
import type { PayLoad_Union_Type } from "../Type_Payload_Schemas/Payload_Union_Type";
import { DEFAULT_SNAPSHOT } from "../Store_InitialState";

export interface PayloadSlice {
    payloads: Record<string, PayLoad_Union_Type>; // id作为key，必要的冗余
    updatePayload: (id: string, updates: Omit<Partial<PayLoad_Union_Type>, 'id'>) => void;
    // 禁止添加已存在的id。
    addMeta: (meta: IdeMeta) => boolean;
    removeMeta: (id: string) => void;
}

export const createMetaSlice: StateCreator<
// 你stateCreator就是为了拆分store设计的，最终通过...展开合并
    GlobalState, // 欲创建的最终状态的类型接口
    [['zustand/immer', never]], // 中间件类型元组，告诉ts再用immer
    [],
    MetaSlice
    > = (set, get) =>
({
    payloads: {},
    updateMeta: (id, updates) =>
    set((state) => {
        const target = state.metas[id];
        if(!target) return state;

        const validation = MetaSchema.partial().safeParse(updates);
        if(!validation.success){
            // 需要一些副操作.
            return state;
        }

        Object.assign(state.metas[id], validation.data);
    }),
    addMeta: (meta) => 
        {
        if(get().metas[meta.id]) {
            return false;
        }

        const validation = MetaSchema.safeParse(meta);
        if(!validation.success){
            
            return false;
        }

        set((state) => {
            if(state.metas[meta.id]) {
                return state; //防异步的。但我也不明白什么算原子。
            }
            state.metas[meta.id] = validation.data;
        })
        return true;
    },
    removeMeta: (id) =>
      set((state) => {
        // 如果不存在，直接返回，Immer 会检测到无变化
        if (!state.metas[id]) return; 
        
        // 直接删除，Immer 会处理不可变性
        delete state.metas[id];
      }),
    // 除非有什么东西不是react组件。有zustand的useStore的selector呢。
    // getMeta: (id) => get().metas[id],
})
