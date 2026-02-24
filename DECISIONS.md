# Decisiones Técnicas y Defaults (MVP)

En base a las reglas del proyecto "Agenda + Caja", se han asumido los siguientes defaults razonables para no bloquear el desarrollo:

## 1. Arquitectura & Stack
- **Framework**: Next.js 14+ con App Router (`app/` directory).
- **Lenguaje**: TypeScript estricto.
- **Estilos**: Tailwind CSS con un diseño utilitario y minimalista.
- **Base de Datos / Auth**: Supabase (PostgreSQL + RLS).
- **Componentes UI**: Tailwind nativo e íconos ligeros (Lucide React) para mantener simples las iteraciones, o Shadcn UI parcial.

## 2. Base de Datos (Modelo de Datos)
Tendremos las siguientes entidades en Postgres, todas relacionadas a un `professional_id` (que será equivalente a `auth.uid()`) para dar soporte a un diseño multi-tenant (escalabilidad), a pesar de que el MVP sea para un solo usuario:

1. `profiles`: Configuración del profesional.
   - Defaults de duración de turno: 60 minutos (configurable en Ajustes).
   - Buffer entre turnos: 0 minutos (configurable en Ajustes).
   - Precio por defecto: 0 (configurable en Ajustes).
   - Moneda default: EUR (configurable en Ajustes).
2. `patients`: Listado de clientes.
   - Datos mínimos: `id`, `name`, `alias`, `phone`.
   - Regla de privacidad: Sin notas ni historia clínica, ni diagnósticos.
3. `appointments`: Turnos.
   - Estado default: `Nueva`.
   - Regla "Turnos vencidos": En vista "Hoy" se calculará dinámicamente si `end_at + 15m < now()` y estado = `Nueva` -> mostrar alerta "Pendiente de recategorización".
   - Reprogramación: Se cambia estado del actual a `Reprogramada` guardando `reprogrammed_to_id`, y se crea un turno clon en otra fecha con status `Nueva` guardando `reprogrammed_from_id`.
   - Pagos: El MVP maneja el pago por sesión, la modalidad y el precio directamente dentro de la tabla `appointments` para simplificar y alinear la caja con la asistencia.
4. `blocks` y `weekly_availability`: Gestión de horarios disponibles y bloqueos.

## 3. Iteraciones de Desarrollo
Para asegurar "cambios chicos por iteración", el desarrollo seguirá este pipeline:
- **Iteración 1**: Inicialización Next.js, esquema Supabase (.sql) y estructura base (Navbar, Shell).
- **Iteración 2**: Settings (Ajustes) y Pacientes (CRUD simple).
- **Iteración 3**: Dashboard "Hoy" y Calendario (vista lista/mes).
- **Iteración 4**: Pagos (Caja/Reportes) y exportación a Excel.

## 4. Diseño y UI
- Responsive first (Mobile friendly para ver la agenda).
- Terminología segura: En la UI sólo se usará "Turno", "Sesión", "Paciente", sin eufemismos clínicos.
