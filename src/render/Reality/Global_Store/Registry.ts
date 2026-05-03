



import { z } from 'zod';

//1-实体切片组
//布局与空间切片，存粹给ui用的
const LayoutSchema = z.object({
  id: z.string(),
  whichUI: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number().int(),
  width: z.number().min(0),
  height: z.number().min(0),
  rotation: z.number().min(0).max(360),
  mirror: z.boolean(),
})
//元信息切片
const MetaSchema = z.object({
  
})

//2-平面关系切片组



