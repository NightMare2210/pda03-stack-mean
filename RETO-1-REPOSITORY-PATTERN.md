# Reto 1 — Desacoplamiento del Backend y Patrón Repository

## El problema de partida

El controller original de Express instanciaba el modelo de Mongoose directamente:

```ts
const Empleado = require('../models/empleado');

empleadoController.addEmpleado = async (req, res) => {
  const empleado = new Empleado(req.body); // la capa HTTP conoce Mongoose
  await empleado.save();
};
```

El controller (capa de red) sabía que la persistencia era Mongoose. Eso mezcla dos responsabilidades en un mismo lugar: manejar la petición HTTP y saber cómo se guarda un empleado en una base de datos concreta. Si mañana cambia el motor de persistencia, o si querés testear el controller sin levantar una base real, no podés — están pegados.

La guía lo exige explícitamente: **si se remueve el `import mongoose` del controlador, el sistema debe seguir compilando.**

## La solución: invertir la dependencia

No se trata de "mover las queries a otro archivo". Se trata de aplicar el **Principio de Inversión de Dependencias**: tanto el controller como Mongoose pasan a depender de una abstracción (una interfaz) en vez de depender uno del otro directamente.

```
ANTES:
  Controller ──depende de──> Mongoose (EmployeeModel)

AHORA:
  Controller ──depende de──> IEmployeeRepository (interfaz)
                                    ▲
                                    │ implementa
                              MongoEmployeeRepository ──depende de──> Mongoose
```

El controller deja de saber que Mongoose existe. Solo conoce un contrato.

## Estructura final

```
backend/src/
├── models/
│   └── empleado.cjs                          # Schema de Mongoose (CommonJS)
├── repositories/
│   ├── employee.repository.interface.ts      # el contrato + el tipo de dominio
│   └── mongo-employee.repository.ts          # implementación concreta (sabe de Mongoose)
├── controllers/
│   └── empleados.controllers.ts              # solo conoce la interfaz
├── routes/
│   └── empleados.routes.ts
├── app.ts                                    # ensamblado de Express (único punto de verdad)
└── index.ts                                  # arranque del servidor
```

### `repositories/employee.repository.interface.ts`

Define el tipo de dominio (`Empleado`) y el contrato (`IEmployeeRepository`) que cualquier implementación tiene que cumplir:

```ts
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
```

Nada de esto menciona Mongoose, `ObjectId`, ni ningún detalle de infraestructura.

### `repositories/mongo-employee.repository.ts`

La única clase de todo el backend que sabe que existe Mongoose. Implementa el contrato y traduce entre el documento de Mongoose y el tipo de dominio (`toDomain`):

```ts
export class EmployeeRepository implements IEmployeeRepository {
  async findAll(): Promise<Empleado[]> {
    const docs = await EmpleadoModel.find();
    return docs.map(toDomain);
  }
  // findById, create, update, delete → mismo patrón:
  // llamar a Mongoose, traducir con toDomain, devolver el tipo de dominio
}
```

El nombre del archivo (`mongo-*`) es intencional: el día de mañana podría existir un `postgres-employee.repository.ts` o un `in-memory-employee.repository.ts` al lado, implementando el mismo contrato, sin que el controller se entere.

> **Nota de consistencia pendiente:** la clase se sigue llamando `EmployeeRepository` a secas dentro de un archivo `mongo-*`. Para que el nombre de la clase refleje lo mismo que el archivo (y no haya ambigüedad si en el futuro aparece una segunda implementación), lo prolijo es renombrarla a `MongoEmployeeRepository`.

### `controllers/empleados.controllers.ts`

Instancia el repositorio concreto una sola vez, pero lo **tipa como la interfaz**:

```ts
const employeeRepository: IEmployeeRepository = new EmployeeRepository();
```

A partir de ahí, todos los métodos del controller (`getEmpleados`, `addEmpleado`, etc.) llaman exclusivamente a `employeeRepository.findAll()`, `.create()`, `.update()`, `.delete()` — nunca a un método de Mongoose. Cero `import mongoose` en este archivo.

## Bugs que aparecieron en el camino (y se corrigieron)

Estos no eran parte literal del Reto 1, pero bloqueaban poder probar cualquier cosa:

1. **`index.ts` nunca montaba las rutas.** El entrypoint real (`npm run dev` → `index.ts`) armaba su propio `app` de Express inline y jamás importaba `app.ts` (que sí tenía las rutas registradas). Se consolidó todo en `app.ts` como único punto de ensamblado; `index.ts` ahora solo lo importa y hace `listen`.
2. **Faltaba el endpoint de consulta por ID.** Una de las 5 operaciones obligatorias de la guía no existía.
3. **`PUT` y `DELETE` no tenían `:id` en la ruta**, pese a que el controller lo esperaba en `req.params`.

## El choque ESM vs. CommonJS (al restaurar `empleado.js`)

Cuando se restauró el modelo original (`empleado.js`, con `require`/`module.exports`), TypeScript empezó a fallar con `TS1192: Module has no default export`.

**Causa real:** el `package.json` del backend declara `"type": "module"`. Bajo esa configuración, Node (y TypeScript en modo `nodenext`) tratan **cualquier** archivo `.js` del proyecto como ES Module puro — donde `module.exports` no es sintaxis válida. El archivo nunca tuvo, para el resolutor de módulos, un "default export" real.

**Solución:** renombrar el archivo a `empleado.cjs`. La extensión `.cjs` le indica a Node "este archivo puntual es CommonJS, sin importar lo que diga `type` en el `package.json`" — sin tocar una sola línea de contenido del archivo original. Se agregaron además `allowJs` y `esModuleInterop` en `tsconfig.json` para que TypeScript pueda resolver e importar ese `.cjs` con `import EmpleadoModel from '../models/empleado.cjs'`.

## Costo de la decisión (trade-off asumido)

Al volver a `empleado.cjs` (JS plano, sin tipos) en vez de mantener un schema de Mongoose tipado en TypeScript, se perdió la traducción tipada en `toDomain`:

```ts
const toDomain = (doc: any): Empleado => ({ ... }); // doc es `any`
```

El repositorio sigue cumpliendo el contrato y la prueba de fuego del Reto 1 (cero Mongoose en el controller), pero ya no hay chequeo de tipos en el borde entre Mongoose y el dominio. Es una decisión consciente, no un descuido.

## La prueba de fuego

```bash
rg -n "mongoose" backend/src/controllers/empleados.controllers.ts
# sin resultados → el controller nunca supo que Mongoose existe
```

Se verificaron las 5 operaciones (POST, GET all, GET by id, PUT, DELETE) contra un cluster real de MongoDB Atlas, tanto por `curl` como desde Postman (vía Postman Desktop Agent, ya que la app web no puede llegar a `localhost` sin él).

## El punto pedagógico central

El Repository Pattern no es "tener una carpeta que se llama repositories". Es lograr que puedas reemplazar `MongoEmployeeRepository` por `InMemoryEmployeeRepository` en un test, o por `PostgresEmployeeRepository` en producción, **sin tocar una sola línea del controller**. Eso es lo que evalúa la rúbrica bajo "Acoplamiento Cero" — no que exista un archivo con el nombre correcto.
