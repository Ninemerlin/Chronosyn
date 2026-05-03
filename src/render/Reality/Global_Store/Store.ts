/*
store，容器
*/
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GlobalState } from './Schema';
import { createMetaSlice } from './Schema_Slices_WithLogic/Meta_Slice';
import { createRuntimeSlice } from './Schema_Slices_WithLogic/Runtime_Slice';
import { createUIStyleSlice } from './Schema_Slices_WithLogic/UI_Style_Slice';
//import { createLayoutSlice } from './Schema_Slices_WithLogic/Ide_All_Layout';


export const useStore = create<GlobalState>()(
  immer((set, get, api) => ({
    ...createMetaSlice(set, get, api),
    ...createRuntimeSlice(set, get, api),
    ...createUIStyleSlice(set, get, api),
    //...createLayoutSlice(set, get),
  }))  
);

