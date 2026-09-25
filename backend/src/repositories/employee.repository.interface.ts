export interface Empleado {
  id: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
}

export type EmpleadoInput = Omit<Empleado, 'id'>;

export interface IEmployeeRepository {
  findAll(): Promise<Empleado[]>;
  findById(id: string): Promise<Empleado | null>;
  create(data: EmpleadoInput): Promise<Empleado>;
  update(id: string, data: Partial<EmpleadoInput>): Promise<Empleado | null>;
  delete(id: string): Promise<boolean>;
}
