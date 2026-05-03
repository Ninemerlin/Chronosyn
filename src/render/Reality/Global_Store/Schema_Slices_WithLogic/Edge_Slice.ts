import { z } from 'zod';
import { StateCreator } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GlobalState } from '../Schema';

// 边的视图层所需属性

const 

export const EdgeSchema = z.object({
    edgeType: z.enum(['straight', 'bezier', 'step', 'curve']),
    


});


// 你zod支持多态。不仅应用到了payload，还直接用在了如今的边上