import { StateCreator } from "zustand";
import { z } from "zod";
import type { GlobalState } from "../Schema";
import { DEFAULT_SNAPSHOT } from "../Store_InitialState";

export const MetaSchema = z.object({
    id: z.string(),
    name: z.string().optional(), // whichUI也是组件本身的自定义名称。非要区分开发者和用户，那就再新增一个属性
    parentId: z.string().nullable().default(null),
    description: z.string(),
    tags: z.array(z.string()),
})

export type IdeMeta = z.infer<typeof MetaSchema>;
export interface MetaSlice {
    metas: Record<string, IdeMeta>; // id作为key，必要的冗余
    // todo: 有关zod的运行时验证，需要了解
    updateMeta: (id: string, updates: Omit<Partial<IdeMeta>, 'id'>) => void;
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
    metas: DEFAULT_SNAPSHOT.metas,
    updateMeta: (id, updates) =>
    set((draft) => {
        const target = draft.metas[id];
        if(!target) return draft;

        const validation = MetaSchema.partial().safeParse(updates);
        if(!validation.success){
            // 需要一些副操作.
            return;
        }

        Object.assign(draft.metas[id], validation.data);
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

        set((draft) => {
            if(draft.metas[meta.id]) {
                return draft; //防异步的。但我也不明白什么算原子。
            }
            draft.metas[meta.id] = validation.data;
        })
        return true;
    },
    removeMeta: (id) =>
      set((draft) => {
        // 如果不存在，直接返回，Immer 会检测到无变化
        if (!draft.metas[id]) return; 
        
        // 直接删除，Immer 会处理不可变性
        delete draft.metas[id];
      }),
    // 除非有什么东西不是react组件。有zustand的useStore的selector呢。
    // getMeta: (id) => get().metas[id],
})
