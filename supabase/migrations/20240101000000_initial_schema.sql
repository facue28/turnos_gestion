-- Migration: Initial Schema for Agenda + Caja

-- Enums (optional, relying on text limits or check constraints for simplicity since it's MVP)

-- 1. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'EUR',
  default_price NUMERIC DEFAULT 0,
  default_duration INTEGER DEFAULT 60,
  buffer_between_appointments INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patients Table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  alias TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Appointments Table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  modality TEXT NOT NULL CHECK (modality IN ('virtual', 'presencial')),
  virtual_link TEXT NULL,
  tipo_pago TEXT CHECK (tipo_pago IN ('Particular', 'Obra_social')) DEFAULT 'Particular',
  obra_social_nombre TEXT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  pay_status TEXT NOT NULL CHECK (pay_status IN ('Pendiente', 'Cobrado', 'Parcial', 'OS_pendiente')) DEFAULT 'Pendiente',
  paid_amount NUMERIC NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= price),
  status TEXT NOT NULL DEFAULT 'Nueva' CHECK (status IN ('Nueva', 'Realizada', 'Cancelada', 'No_asistio', 'Reprogramada')),
  fuera_de_grilla BOOLEAN DEFAULT false,
  reprogrammed_from_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  reprogrammed_to_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT appointments_end_after_start CHECK (end_at > start_at)
);

-- 4. Blocks Table
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT blocks_end_after_start CHECK (end_at > start_at)
);

-- 5. Weekly Availability Table
CREATE TABLE public.weekly_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT weekly_availability_end_after_start CHECK (start_time < end_time)
);

-- Indexes
CREATE INDEX idx_appointments_prof_start ON public.appointments (professional_id, start_at);
CREATE INDEX idx_patients_prof_name ON public.patients (professional_id, name);
CREATE INDEX idx_blocks_prof_start ON public.blocks (professional_id, start_at);

-- Trigger to update 'updated_at' columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_patients_modtime BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_appointments_modtime BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_blocks_modtime BEFORE UPDATE ON public.blocks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_weekly_availability_modtime BEFORE UPDATE ON public.weekly_availability FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_availability ENABLE ROW LEVEL SECURITY;

-- Create Policies (Auth models using auth.uid())
-- For profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- For patients
CREATE POLICY "Users can view own patients" ON public.patients FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Users can insert own patients" ON public.patients FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Users can update own patients" ON public.patients FOR UPDATE USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Users can delete own patients" ON public.patients FOR DELETE USING (auth.uid() = professional_id);

-- For appointments
CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Users can insert own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Users can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Users can delete own appointments" ON public.appointments FOR DELETE USING (auth.uid() = professional_id);

-- For blocks
CREATE POLICY "Users can view own blocks" ON public.blocks FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Users can insert own blocks" ON public.blocks FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Users can update own blocks" ON public.blocks FOR UPDATE USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Users can delete own blocks" ON public.blocks FOR DELETE USING (auth.uid() = professional_id);

-- For weekly_availability
CREATE POLICY "Users can view own weekly_availability" ON public.weekly_availability FOR SELECT USING (auth.uid() = professional_id);
CREATE POLICY "Users can insert own weekly_availability" ON public.weekly_availability FOR INSERT WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Users can update own weekly_availability" ON public.weekly_availability FOR UPDATE USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);
CREATE POLICY "Users can delete own weekly_availability" ON public.weekly_availability FOR DELETE USING (auth.uid() = professional_id);

-- Create a helper function/trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
