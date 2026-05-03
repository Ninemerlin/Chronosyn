import { StateCreator } from "zustand";
import { string, z } from "zod";
import type { GlobalState } from "../Schema";

// 不管怎么说，UI需要一个渲染类型字段——注册机会记录你打算用什么UI组件渲染你它

export const UI_REGIST_TYPE = [
    'default'
] as const;

export const UIStyleSchema = z.object({

    'uiRegistType': z.enum(UI_REGIST_TYPE),
})

export type UIStyleType = z.infer<typeof UIStyleSchema>;
export type UIRegistType = UIStyleType['uiRegistType'];

export interface UIStyleSlice {
    style: Record<string, UIStyleType>;
}

export const createUIStyleSlice: StateCreator<
    GlobalState,
    [['zustand/immer', never]],
    [],
    UIStyleSlice
> = (set, get, api) => ({
    style: {
        'id': {
            'uiRegistType': 'default'
        }
    },
})