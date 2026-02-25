# Modelo de Datos (MVP) - Agenda + Caja

A continuación se detalla la estructura de la base de datos a utilizar en Supabase para el MVP. Todas las tablas incluyen nivel de seguridad (RLS) asegurando que `professional_id = auth.uid()`.

## 1. perfiles (`profiles`)
Configuración general del profesional. Se crea automáticamente al registrar un usuario gracias a un trigger en Supabase.

| Campo | Tipo | Notas / Default |
| - | - | - |
| `id` | UUID | PK. FK a `auth.users(id)` |
| `currency` | TEXT | Moneda (Default: 'EUR') |
| `default_price` | NUMERIC | Precio por sesión (Default: 0) |
| `default_duration` | INTEGER | Minutos (Default: 60) |
| `buffer_between_appointments`| INTEGER | Minutos de descanso (Default: 0) |

## 2. pacientes (`patients`)
Directorio de pacientes. Estrictamente sin información clínica.

| Campo | Tipo | Notas / Default |
| - | - | - |
| `id` | UUID | PK |
| `tenant_id` | UUID | FK a `tenants(id)` |
| `name` | TEXT | Nombre completo |
| `alias` | TEXT | Formato corto o apodo (opcional) |
| `phone` | TEXT | Número de contacto (opcional) |
| `email` | TEXT | Correo electrónico (opcional) |
| `insurance` | TEXT | Obra Social / Prepaga (opcional) |
| `notes` | TEXT | Notas adicionales (opcional) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

## 3. turnos/caja (`appointments`)
Tabla central que maneja la agenda y la caja en simultáneo.

| Campo | Tipo | Notas / Default |
| - | - | - |
| `id` | UUID | PK |
| `professional_id` | UUID | FK a `profiles(id)` |
| `patient_id` | UUID | FK a `patients(id)` |
| `start_at` | TIMESTAMPTZ | Fecha y hora de inicio |
| `end_at` | TIMESTAMPTZ | Fecha y hora de fin |
| `duration_min` | INTEGER | NOT NULL. Duración explícita del turno (CHECK > 0) |
| `modality` | TEXT | NOT NULL. 'virtual' o 'presencial' |
| `virtual_link` | TEXT | Enlace a videollamada (opcional) |
| `tipo_pago` | TEXT | 'Particular' o 'Obra_social' (Default: 'Particular') |
| `obra_social_nombre`| TEXT | Nombre de la obra social (opcional) |
| `price` | NUMERIC | NOT NULL. Precio del turno (Default: 0) |
| `pay_status` | TEXT | NOT NULL. Enum: 'Pendiente', 'Cobrado', 'Parcial', 'OS_pendiente' |
| `paid_amount` | NUMERIC | NOT NULL. Monto efectivamente abonado (Default: 0, CHECK <= price y >= 0) |
| `status` | TEXT | NOT NULL. Enum: 'Nueva', 'Realizada', 'Cancelada', 'No_asistio', 'Reprogramada' |
| `fuera_de_grilla` | BOOLEAN | Marca si se forzó horario (Default: false) |
| `reprogrammed_from_id`| UUID | FK a `appointments(id)`. Turno original cancelado |
| `reprogrammed_to_id` | UUID | FK a `appointments(id)`. Nuevo turno creado |

**Constraints Adicionales**: `CHECK(end_at > start_at)`

## 4. disponibilidades semanales (`weekly_availability`)
Plantilla para construir la grilla de turnos.

| Campo | Tipo | Notas |
| - | - | - |
| `id` | UUID | PK |
| `professional_id` | UUID | FK a `profiles(id)` |
| `weekday` | INTEGER | NOT NULL. 0 (Domingo) a 6 (Sábado) |
| `start_time` | TIME | NOT NULL. Hora de inicio |
| `end_time` | TIME | NOT NULL. Hora de fin |

**Constraints Adicionales**: `CHECK(end_time > start_time)`

## 5. bloqueos (`blocks`)
Excepciones donde el profesional no puede atender (vacaciones, trámites, etc.).

| Campo | Tipo | Notas |
| - | - | - |
| `id` | UUID | PK |
| `professional_id` | UUID | FK a `profiles(id)` |
| `start_at` | TIMESTAMPTZ | Fecha/hora inicio del bloqueo |
| `end_at` | TIMESTAMPTZ | Fecha/hora fin del bloqueo |
| `reason` | TEXT | Motivo (opcional) |

**Constraints Adicionales**: `CHECK(end_at > start_at)`

## Consideraciones RLS y Seguridad
- Se aplican políticas utilizando el modificador `WITH CHECK(auth.uid() = professional_id)` para asegurar que el `professional_id` de los registros insertados o actualizados pertenezca estrictamente al usuario en sesión.
- La función `handle_new_user()` encargada de crear el profile asegura un entorno de ejecución seguro empleando `SECURITY DEFINER SET search_path = public`.

## Índices de Performance
Para soportar el rápido acceso a las pantallas principales del MVP se han configurado los siguientes índices:
- `idx_appointments_prof_start`: Sobre `appointments(professional_id, start_at)` para la grilla semanal y dashboard "Hoy".
- `idx_patients_prof_name`: Sobre `patients(professional_id, name)` para la barra de búsqueda / autocompletado en turnos.
- `idx_blocks_prof_start`: Sobre `blocks(professional_id, start_at)` para calcular la disponibilidad fácilmente.
