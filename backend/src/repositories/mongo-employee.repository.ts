import EmpleadoModel from '../models/empleado.cjs';
import type { Empleado, EmpleadoInput, IEmployeeRepository } from './employee.repository.interface.js';

const toDomain = (doc: any): Empleado => ({
  id: doc._id.toString(),
  nombre: doc.nombre,
  cargo: doc.cargo,
  departamento: doc.departamento,
  sueldo: doc.sueldo,
});

export class EmployeeRepository implements IEmployeeRepository {
  async findAll(): Promise<Empleado[]> {
    const docs = await EmpleadoModel.find();
    return docs.map(toDomain);
  }

  async findById(id: string): Promise<Empleado | null> {
    const doc = await EmpleadoModel.findById(id);
    return doc ? toDomain(doc) : null;
  }

  async create(data: EmpleadoInput): Promise<Empleado> {
    const doc = await EmpleadoModel.create(data);
    return toDomain(doc);
  }

  async update(id: string, data: Partial<EmpleadoInput>): Promise<Empleado | null> {
    const doc = await EmpleadoModel.findByIdAndUpdate(id, data, { new: true });
    return doc ? toDomain(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const doc = await EmpleadoModel.findByIdAndDelete(id);
    return doc !== null;
  }
}
