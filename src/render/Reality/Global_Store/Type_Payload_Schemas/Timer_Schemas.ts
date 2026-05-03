import { z } from 'zod';
import { createPayloadSchema } from './Payload_Union_Type';


export const TimerSchema = createPayloadSchema(
    'Timer',
    'polling',
    'trigger',
    {
        
    }
)