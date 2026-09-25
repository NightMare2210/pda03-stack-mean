import type { Request, Response } from 'express';
import { EmployeeRepository } from '../repositories/mongo-employee.repository.js';
import type { IEmployeeRepository } from '../repositories/employee.repository.interface.js';
import { NotFoundError } from '../errors/app-error.js';
import { sendSuccess } from '../utils/api-response.js';

const employeeRepository: IEmployeeRepository = new EmployeeRepository();

export const getEmpleados = async (req: Request, res: Response): Promise<void> => {
  const empleados = await employeeRepository.findAll();
  sendSuccess(res, empleados);
};

export const getEmpleadoById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const empleado = await employeeRepository.findById(id);
  if (!empleado) {
    throw new NotFoundError('Empleado no encontrado');
  }
  sendSuccess(res, empleado);
};

export const addEmpleado = async (req: Request, res: Response): Promise<void> => {
  const empleado = await employeeRepository.create(req.body);
  sendSuccess(res, empleado, 201, 'Empleado guardado');
};

export const updateEmpleado = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const empleado = await employeeRepository.update(id, req.body);
  if (!empleado) {
    throw new NotFoundError('Empleado no encontrado');
  }
  sendSuccess(res, empleado, 200, 'Empleado actualizado');
};

export const deleteEmpleado = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const eliminado = await employeeRepository.delete(id);
  if (!eliminado) {
    throw new NotFoundError('Empleado no encontrado');
  }
  sendSuccess(res, null, 200, 'Empleado eliminado');
};
