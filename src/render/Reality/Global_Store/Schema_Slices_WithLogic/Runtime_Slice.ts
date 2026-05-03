import { StateCreator } from "zustand";
import { templateLiteral, z } from "zod";
import type { GlobalState } from "../Schema";
import { Optional } from "pixi.js";

export const RuntimeSchema = z.object({
    id: z.string(),
    isExecuting: z.boolean().optional(),
    errorMsg: z.string().optional(),
    focused: z.boolean().optional(),
})

export type IdeRuntime = z.infer<typeof RuntimeSchema>;
export interface MetaSlice {
    metas: Record<string, IdeRuntime>; // id作为key，必要的冗余
    // todo: 有关zod的运行时验证，需要了解
    updateRuntime: (id: string, updates: Omit<Partial<IdeRuntime>, 'id'>) => void;
    // 禁止添加已存在的id。
    addMeta: (meta: IdeRuntime) => boolean;
    removeMeta: (id: string) => void;
    resetRuntime: (id: string) => void;

    // 全局runtime清除
    resetAllRuntimes: () => void;
}

export const createMetaSlice: StateCreator<
// 你stateCreator就是为了拆分store设计的，最终通过...展开合并
    GlobalState, // 欲创建的最终状态的类型接口
    [['zustand/immer', never]], // 中间件类型元组，告诉ts再用immer
    [],
    MetaSlice
    > = (set, get) =>
({
    metas: {},
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
    // 使用undefined值代表属性已移除
    // ECS中对象只有两种合法状态：属性符合设计，默认值或被删除
    removeMeta: (id) =>
      set((state) => {
        // 如果不存在，直接返回，Immer 会检测到无变化
        if (!state.metas[id]) return; 
        
        // 直接删除，Immer 会处理不可变性
        delete state.metas[id];
    }),

    resetMetas: () =>
      set(() => ({ metas: {} })),
    
    // 除非有什么东西不是react组件。有zustand的useStore的selector呢。
    // getMeta: (id) => get().metas[id],
})
