-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create orders table
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_name TEXT NOT NULL,
  service_type TEXT NOT NULL, -- e.g., 'Wedding', 'Graduation'
  event_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'done'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  drive_link TEXT,
  max_selections INTEGER,
  client_selection_link TEXT,
  payment_status TEXT DEFAULT 'dp', -- 'dp', 'lunas'
  client_phone TEXT,
  location TEXT,
  wa_sent_instant BOOLEAN DEFAULT false,
  wa_sent_h1 BOOLEAN DEFAULT false
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders are viewable by authenticated users" ON public.orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Orders are insertable by authenticated users" ON public.orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Orders are updatable by authenticated users" ON public.orders FOR UPDATE USING (auth.role() = 'authenticated');

-- Create shotlist_templates table
CREATE TABLE public.shotlist_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_type TEXT NOT NULL,
  session_type TEXT NOT NULL, -- e.g., 'Akad', 'Resepsi'
  item_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Wajib', 'Secondary', 'Kreatif'
  technical_note TEXT
);

ALTER TABLE public.shotlist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates viewable by authenticated users" ON public.shotlist_templates FOR SELECT USING (auth.role() = 'authenticated');

-- Create order_tasks table
CREATE TABLE public.order_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  category TEXT NOT NULL,
  session_type TEXT,
  technical_note TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.order_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks viewable by authenticated users" ON public.order_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Tasks insertable by authenticated users" ON public.order_tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tasks updatable by authenticated users" ON public.order_tasks FOR UPDATE USING (auth.role() = 'authenticated');

-- Create finances table
CREATE TABLE public.finances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  expenses NUMERIC NOT NULL DEFAULT 0,
  expenses_list JSONB DEFAULT '[]'::jsonb,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finances viewable by authenticated users" ON public.finances FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finances insertable by authenticated users" ON public.finances FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Finances updatable by authenticated users" ON public.finances FOR UPDATE USING (auth.role() = 'authenticated');

-- Function to handle new user signup and create profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'editor');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert some initial templates for 'Wedding'
INSERT INTO public.shotlist_templates (service_type, session_type, item_name, category) VALUES
('Wedding', 'Akad', 'Ijab Kabul', 'Wajib'),
('Wedding', 'Akad', 'Pemasangan Cincin', 'Wajib'),
('Wedding', 'Akad', 'Sungkeman', 'Wajib'),
('Wedding', 'Akad', 'Suasana Ruangan Akad', 'Secondary'),
('Wedding', 'Akad', 'Detail Cincin & Mahar', 'Kreatif'),
('Wedding', 'Resepsi', 'Kirab Pengantin', 'Wajib'),
('Wedding', 'Resepsi', 'Foto Bersama Keluarga Inti', 'Wajib'),
('Wedding', 'Resepsi', 'First Dance / Momen Spesial', 'Secondary'),
('Wedding', 'Resepsi', 'Dekorasi & Katering', 'Secondary'),
('Wedding', 'Resepsi', 'Candid Tamu Tertawa', 'Kreatif');

