import { StateCreator } from 'zustand';
import { z } from 'zod';
import { initialLayoutData } from '../Store_InitialState';
import { ALL_REGISTRY_ELEMENTS} from '../Registry';

// 参考概念：unity的变换组件
// 用于画布引擎统一调动的基础信息

// 变换，碰撞，样式是三个部分。

const BaseElementSchema = z.object( {
  id: z.string(),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive().default(100),
  height: z.number().positive().default(100),
  rotation: z.number().min(0).max(360).default(0),
  zIndex: z.number().int(),
})

export const ELEMENT_LAYOUT_DEFINITIONS = {
  'ide-base':  BaseElementSchema.extend({
    elementIs: z.literal('ide-base')
  })
} as const;
//辨识联合类型：根据某个属性值区分成员
export const LayoutElementSchema = z.discriminatedUnion('elementIs', [
  Object.values(ELEMENT_LAYOUT_DEFINITIONS) as any
])

export type IdeAllLayoutElement = z.infer<typeof LayoutElementSchema>
export type LayoutElementType = IdeAllLayoutElement['elementIs']
export interface IdeAllLayoutSlice {
  layouts: Record<string, IdeAllLayoutElement>;
  updateLayout: (id: string, updates: Partial<IdeAllLayoutElement>) => void;
}

export const createLayoutSlice: StateCreator<IdeAllLayoutSlice> = (set, get) => ({
  layouts: initialLayoutData,
  updateLayout: (id, updates) =>
    set((state) => {
      const target = state.layouts[id];
      if(!target) return state;

      const specificSchema = LayoutElementSchemaMap[target.elementIs as LayoutElementType]
      if(!specificSchema) return state;
      
      //todo: 高频性能有问题。
      const validation = specificSchema.partial().safeParse(updates);

      if(!validation.success){
        // todo: 需要一些副操作
        return state;
      }

      return {
        layouts: {
          ...state.layouts, // 浅拷贝完整布局
          [id]: { // 对传入的id-content查找指明的键值对象
            ...target, //浅拷贝展开刚记录的键值对象的值
            ...validation.data, // 内容是对象，位于target后，覆盖target的键值对
          } as IdeAllLayoutElement,
        }
      }
    }),
});