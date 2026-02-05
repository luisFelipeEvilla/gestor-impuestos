# Gestor de Impuestos

Plataforma de gestión de procesos de cobro de impuestos (Colombia). Next.js (App Router), TypeScript, Drizzle ORM y PostgreSQL.

## Requisitos

- Node.js 20+
- pnpm
- Docker (para PostgreSQL)

## Configuración

1. **Clonar e instalar dependencias**

   ```bash
   pnpm install
   ```

2. **Variables de entorno**

   Copia `.env.example` a `.env` y ajusta si es necesario. Por defecto:

   ```env
   DATABASE_URL=postgresql://postgres:gestor_dev@localhost:5432/gestor_impuestos
   ```

3. **Base de datos**

   **Opción A – Docker (recomendado)**  
   Asegúrate de que no haya otro PostgreSQL usando el puerto 5432 (ej. `brew services stop postgresql` si usas Homebrew). Luego:

   ```bash
   docker compose up -d
   ```

   **Opción B – PostgreSQL local (macOS/Homebrew)**  
   El usuario por defecto suele ser tu usuario del sistema, no `postgres`. En `.env` usa:

   ```env
   DATABASE_URL=postgresql://TU_USUARIO@localhost:5432/gestor_impuestos
   ```

   Crea la base de datos:

   ```bash
   createdb gestor_impuestos
   ```

   **Migraciones (con la BD ya levantada y `.env` correcto):**

   ```bash
   pnpm run db:generate   # solo si cambias el esquema en lib/db/schema.ts
   pnpm run db:migrate    # aplica migraciones pendientes
   ```

   Opcional: inspeccionar datos con Drizzle Studio:

   ```bash
   pnpm run db:studio
   ```

4. **Desarrollo**

   ```bash
   pnpm dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Script        | Descripción                          |
|---------------|--------------------------------------|
| `pnpm dev`    | Servidor de desarrollo                |
| `pnpm build`  | Build de producción                   |
| `pnpm start`  | Servidor de producción                |
| `pnpm lint`   | ESLint                               |
| `pnpm db:generate` | Genera migraciones (Drizzle Kit)  |
| `pnpm db:migrate` | Aplica migraciones a la BD        |
| `pnpm db:studio`  | Abre Drizzle Studio                |
| `pnpm db:push`    | Empuja esquema sin migraciones (dev) |

## Estructura

- `app/(dashboard)/` — Rutas del dashboard (/, /procesos, /contribuyentes, /impuestos)
- `lib/db/` — Drizzle: esquema (`schema.ts`) y conexión (`index.ts`)
- `components/` — UI (sidebar, botones, cards)
- `docs/` — Definición del proyecto y glosario Colombia

## Diagnóstico de conexión

Si las migraciones o la app fallan al conectar a la BD, ejecuta:

```bash
pnpm run db:check
```

Ese script intenta conectarse con tu `DATABASE_URL` y muestra el error exacto (base no existe, usuario incorrecto, conexión rechazada, etc.).

## Problemas frecuentes

- **`role "postgres" does not exist`**  
  La instancia de PostgreSQL a la que te conectas no tiene el usuario `postgres`.  
  - Si usas **Docker**: comprueba que el contenedor esté en marcha (`docker compose ps`) y que nada más use el puerto 5432.  
  - Si usas **PostgreSQL local**: en `.env` pon como usuario el de tu sistema (ej. el que devuelve `whoami`) y crea la BD con `createdb gestor_impuestos`. Ver `.env.example` opción 2.

- **Conexión con usuario local (ej. `luisevilla`) no funciona**  
  1. Comprueba que PostgreSQL esté en marcha: `brew services list` o `pg_isready -h localhost`.  
  2. Comprueba que la base exista: `psql -U luisevilla -l` (debe aparecer `gestor_impuestos`). Si no, créala: `createdb gestor_impuestos`.  
  3. Si tu instalación pide contraseña, usa en `.env`: `postgresql://luisevilla:TU_PASSWORD@localhost:5432/gestor_impuestos`.  
  4. Algunas instalaciones solo aceptan conexión por socket: prueba en la URL añadir `?host=/tmp` o usar el socket que use tu Postgres (en macOS con Homebrew suele ser `/tmp` o el que indique `pg_config --sysconfdir`).

## Documentación

- [Definición del proyecto (Colombia)](docs/DEFINICION-PROYECTO.md)
