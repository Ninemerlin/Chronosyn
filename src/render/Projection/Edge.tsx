import { IdeMeta } from "../Reality/Global_Store/Schema_Slices_WithLogic/Meta_Slice";

// 这是正确的。实体在usestore中存着，但是需要一个类型来指导访问store
// 不对不对，我本身就知道ui需要哪些数据，根本不需要在这里写明
type EdgeView = {
    meta: IdeMeta;

}