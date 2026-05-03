import { z } from 'zod';
import { StateCreator } from 'zustand';
import type { GlobalState } from '../Schema';

// 关系是与实体平级的另一种一等公民。
// 基础知识，换个架构就被搞懵了

// 边使用了俩个slice来定义灵魂和外观
// 而实际上，这是节点的翻版
// 节点使用了payload和layout来定义灵魂和外观
// 因为需要存储外观，所以分别引入了第二个slice
// 因为本质上只有两个一等公民，所以只有payload和topology
// layout_slice是第一个出现的，只是因为我被视觉主导，被oop引导罢了。

// 边的逻辑层所需属性

export const EdgeSchema = z.object({
    id: z.string(),

    sourceNodeId: z.string(),
    sourcePortId: z.string(), 
    targetNodeId: z.string(),
    targetPortId: z.string(),

    isDirected: z.boolean().default(true),
    isLoop: z.boolean().default(false),


})