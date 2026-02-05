# Definición del proyecto: Gestor de Impuestos (Cobros)

**Contexto:** Plataforma para la gestión de procesos de cobro de impuestos en **Colombia**.

---

## 1. Objetivo del sistema

Centralizar y dar seguimiento a los procesos de cobro de impuestos, con roles (administradores y empleados), estados por proceso y trazabilidad, teniendo como sujeto pasivo a la **persona natural o jurídica** a la cual se le realiza el cobro.

---

## 2. Contexto Colombia

### 2.1 Marco tributario
- **DIAN** (Dirección de Impuestos y Aduanas Nacionales): entidad que administra impuestos y aduanas.
- **NIT** (Número de Identificación Tributaria): identificador tributario en Colombia (equivalente al RFC en otros países). Personas naturales pueden usar Cédula de Ciudadanía.
- **RUT** (Registro Único Tributario): registro que agrupa obligaciones ante la DIAN.

### 2.2 Impuestos típicos a considerar (catálogo)
- **Impuesto de Renta y Complementarios** – personas naturales y jurídicas.
- **IVA** (Impuesto sobre las Ventas).
- **ICA** (Impuesto de Industria y Comercio) – municipal.
- **Predial** (Impuesto Predial Unificado) – municipal.
- **Retención en la fuente** (cuando aplique como obligación de cobro).
- **Timbre** (cuando aplique).
- **Otros** – definidos por la entidad según su jurisdicción (municipal, distrital, nacional).

### 2.3 Consideraciones locales
- Normativa municipal para ICA y Predial (cada municipio puede tener particularidades).
- Plazos y procedimientos de cobro coactivo según la ley (Ley 2010 de 2019 y normas que la reglamenten).
- Uso de **NIT** y **razón social** o **nombre completo** para identificación del contribuyente.
- Moneda: **COP** (pesos colombianos) para montos.

---

## 3. Modelo de dominio

### 3.1 Impuestos como procesos/trabajos
- **Impuesto**: concepto tributario (catálogo). Ej.: Predial, ICA, Renta, IVA.
- **Proceso de cobro**: una instancia concreta de cobro de un impuesto para un contribuyente en un periodo/vigencia determinada.
- Un mismo impuesto genera muchos procesos (uno por contribuyente y periodo).

**Entidades:**
- **Impuesto** (catálogo): nombre, código, tipo (nacional/municipal), descripción, activo.
- **Proceso**: vincula Impuesto + Contribuyente + vigencia/periodo + estado + monto + asignación.

### 3.2 Usuarios y roles
| Rol            | Descripción                                                                 |
|----------------|-----------------------------------------------------------------------------|
| **Administrador** | Usuarios, catálogos, impuestos, asignación de procesos, reportes, configuración. |
| **Empleado**      | Ver procesos asignados, cambiar estados, registrar notas, gestionar cobros.     |

**Opcional (futuro):**
- **Supervisor**: ver procesos del equipo/área, métricas, reasignaciones.
- **Solo lectura / Auditoría**: consulta y auditoría.

### 3.3 Estados del proceso (workflow)
Flujo sugerido para cobros en Colombia:

| Estado              | Descripción breve                                              |
|---------------------|----------------------------------------------------------------|
| **Pendiente / Nuevo** | Proceso creado, sin asignar o sin iniciar.                     |
| **Asignado**        | Asignado a un empleado.                                        |
| **En contacto**     | Gestión activa con el contribuyente.                          |
| **Notificado**      | Aviso o requerimiento de pago enviado.                         |
| **En negociación**  | Acuerdos de pago o convenios en trámite.                       |
| **Cobrado**         | Pago recibido (cierre exitoso).                                 |
| **Incobrable**      | Cerrado sin cobro (con motivo registrado).                     |
| **En cobro coactivo** | Trámite ante autoridad competente (ej. cobro coactivo).     |
| **Suspendido**      | Pausado (impugnación, revisión, etc.).                         |

**Recomendación:** definir una máquina de estados explícita (transiciones permitidas por rol) para evitar estados incoherentes.

### 3.4 Persona final (contribuyente)
- **Contribuyente**: persona natural o jurídica titular de la obligación tributaria.
- Datos mínimos sugeridos:
  - **NIT** (o documento de identidad).
  - Nombre o razón social.
  - Contacto (teléfono, correo).
  - Domicilio o dirección.
- Un contribuyente puede tener varios procesos (varios impuestos o periodos).

---

## 4. Estrategias recomendadas

### 4.1 Arquitectura técnica
- **Frontend:** Next.js (App Router), TypeScript, TailwindCSS, Shadcn/ui.
- **Backend:** NestJS, TypeScript, API REST (Swagger).
- **Base de datos:** PostgreSQL + Drizzle ORM.
- **Tareas asíncronas:** Trigger.dev (notificaciones, recordatorios, reportes).

### 4.2 Trazabilidad (tracking)
- **Historial por proceso:** cada cambio de estado, reasignación o evento con usuario, fecha, estado anterior/nuevo, comentario.
- Registrar: creación, cambio de estado, asignación, notas, notificaciones, registro de pago.
- Base para auditoría y métricas (tiempos por estado, por usuario, por tipo de impuesto).

### 4.3 Seguridad y permisos
- Autenticación con JWT (o sesión server-side) y refresh.
- RBAC: cada endpoint valida el rol; empleados solo ven procesos asignados; administradores ven todo.
- No exponer datos que el rol no deba ver.

### 4.4 Flujo de trabajo
- Transiciones permitidas definidas por estado (y opcionalmente por rol).
- Frontend muestra solo acciones válidas; backend rechaza transiciones no permitidas.
- Opcional: reglas por tipo de impuesto (ej. “En cobro coactivo” solo para ciertos impuestos).

### 4.5 Escalabilidad
- Catálogos en BD (impuestos, motivos de cierre, etc.).
- Paginación y filtros en listados.
- Exportación (CSV/Excel) para reportes.
- Considerar multi-tenant si varias dependencias (municipios, secretarías) usarán la misma plataforma.

### 4.6 UX
- Dashboard: resumen por estado, por asignado, vencimientos, montos (COP).
- Lista “mis procesos” con filtros y orden.
- Detalle del proceso: contribuyente, impuesto, historial, acciones permitidas.
- Recordatorios para empleados (vencimientos, procesos sin movimiento).

### 4.7 Integraciones (futuro)
- Pagos (pasarela o enlace a portales de pago).
- Envío de avisos (correo, SMS).
- Cruce con sistemas de la DIAN o contables para conciliar pagos.

---

## 5. Esquema de datos (resumen)

```
Impuesto (catálogo)
  id, nombre, codigo, tipo (nacional | municipal), descripcion, activo, ...

Contribuyente (persona final)
  id, nit, tipo_documento, nombre_razon_social, telefono, email, direccion, ciudad, departamento, ...

Usuario
  id, email, nombre, rol (admin | empleado), activo, ...

Proceso (trabajo de cobro)
  id, impuesto_id, contribuyente_id, vigencia, periodo (opcional), monto_cop,
  estado_actual, asignado_a_id (user_id), fecha_limite, creado_en, actualizado_en, ...

HistorialProceso (tracking)
  id, proceso_id, usuario_id, tipo_evento (cambio_estado | asignacion | nota | notificacion | pago),
  estado_anterior, estado_nuevo, comentario, metadata (JSON opcional), fecha, ...
```

---

## 6. Orden de implementación sugerido

1. **Modelo de datos:** Impuesto, Contribuyente, Usuario, Proceso, HistorialProceso.
2. **Autenticación y roles:** login, permisos en API y frontend.
3. **CRUD de catálogos:** Impuestos, Contribuyentes, Usuarios (admin).
4. **CRUD de Procesos:** crear, listar, filtrar, detalle; transiciones de estado con historial.
5. **Asignación:** asignar/reasignar procesos y reglas de visibilidad.
6. **Dashboard y reportes básicos** (conteos por estado, usuario, impuesto; montos en COP).
7. **Notificaciones y tareas en background.**
8. **Exportación y mejoras** (más roles, integraciones).

---

## 7. Glosario (Colombia)

| Término     | Significado                                                        |
|------------|--------------------------------------------------------------------|
| **DIAN**   | Dirección de Impuestos y Aduanas Nacionales.                       |
| **NIT**    | Número de Identificación Tributaria.                              |
| **RUT**    | Registuro Único Tributario.                                        |
| **ICA**    | Impuesto de Industria y Comercio (municipal).                       |
| **COP**    | Peso colombiano.                                                   |
| **Vigencia** | Año fiscal o periodo al que corresponde el impuesto.            |

---

*Documento de definición del proyecto — Gestor de Impuestos (Colombia).*
