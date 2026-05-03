// import { NumericPayload } from "./NumericValue";
import { z } from "zod";
import { TimerSchema } from "./Timer_Schemas";

// 强类型schema注册机：为了解决extend后，literal取非法值覆盖enum时根本不报错的问题
export const PayLoad_Exec_Type_Enum = z.enum([
    'event',
    'polling',
    'lazy'
])

export const PayLoad_Logic_Type_Enum = z.enum([
    'trigger',
    'pure-func',
    'stateful',
    'flow',
    'side-effect'
])

type PayloadExecType = z.infer<typeof PayLoad_Exec_Type_Enum>
type PayloadLogicType = z.infer<typeof PayLoad_Logic_Type_Enum>

// 通过泛型直接传值构建类型。
// 用TypeScript的泛型约束zod是一个标准方法
export function createPayloadSchema<
    TEntity extends string,
    TCustom extends z.ZodRawShape //Ai神力，内部类型随便用
    >(
        entityType: TEntity,
        execModel: PayloadExecType, //泛型提供了强类型约束
        logicModel: PayloadLogicType,
        customSchema?: TCustom
    ){
        return z.object({
            entityType: z.literal(entityType),
            execModel: z.literal(execModel),
            logicModel: z.literal(logicModel),
            ...customSchema,
        });
    }
// 对于如何实例化一个payload对象，塞到payloadSlice的payload字段：
// import { PayLoad_Union_Type } from '../Type_Payload_Schemas';
// const entityId = 'node-999';
// const entityType = 'Counter';
// const schema = PayLoad_Union_Type[entityType];
// const newPayloadData = schema.parse({ entityType }); //parse是验证，内存开辟：传进去的就是对象
// useStore.setState((draft) => {
//   draft.payloads[entityId] = newPayloadData; 
// });

export const PayLoad_Union_Schema = z.discriminatedUnion('entityType', [
    TimerSchema,
])
export type PayLoad_Union_Type = z.infer<typeof PayLoad_Union_Schema>;