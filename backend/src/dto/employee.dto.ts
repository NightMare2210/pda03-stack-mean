import { z } from 'zod';

export const createEmployeeSchema = z
  .object({
    nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    cargo: z.string().min(2, 'El cargo debe tener al menos 2 caracteres'),
    departamento: z.string().min(2, 'El departamento debe tener al menos 2 caracteres'),
    sueldo: z.number().positive('El sueldo debe ser un número positivo'),
  })
  .strict();

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const idParamSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido'),
  })
  .strict();

export type CreateEmployeeDTO = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeDTO = z.infer<typeof updateEmployeeSchema>;
