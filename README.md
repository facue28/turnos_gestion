# Agenda + Caja (MVP)

Aplicación web "privacy-first" para gestión de turnos y finanzas, diseñada para psicólogos/as independientes.

## Requisitos
- Node.js 18+
- npm

## Tecnologías Principales
- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Íconos:** Lucide React
- **Base de Datos & Auth:** Supabase (Próxima iteración)

## Cómo correr el proyecto localmente

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Levantar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

3. **Modo Demo (Opcional):**
   Si no querés crear un usuario ni validar mails, podés usar un login de demostración. Agregá al final de tu `.env.local` la cuenta que previamente registres en el panel de Supabase:
   ```env
   DEMO_EMAIL=demo@turnos-gestion.local
   DEMO_PASSWORD=Gestion_turnos123
   ```
   (Estas variables de entorno **no se filtrarán** al HTML porque no empiezan con `NEXT_PUBLIC_`, por lo que son seguras).

4. **Acceder a la app:**
   Abrí [http://localhost:3000](http://localhost:3000) en tu navegador. Alternativamente podés clickear en "Entrar con Demo" en la página de `/login` si pre-configuraste las variables.

## Iteraciones

- **Iteración 1:** Setup inicial, dependencias, modelo de base de datos SQL (`supabase/migrations`), documentaciones de diseño y UI Base funcional (placeholders sin lógica).
- **Iteraciones futuras:** Integración Auth de Supabase (SSR), Funcionalidades CRUD de pacientes/turnos, Reportes exportables.
