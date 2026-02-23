-- Create consultation_requests table
CREATE TABLE IF NOT EXISTS public.consultation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  hospital_name TEXT NOT NULL,
  region TEXT,
  contact TEXT,
  preferred_date DATE,
  preferred_time_slot TEXT, -- 'morning' | 'afternoon' | 'evening'
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'completed' | 'cancelled'
  admin_notes TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert via public form
CREATE POLICY "Allow public insert on consultation_requests"
  ON public.consultation_requests
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (admin) can read
CREATE POLICY "Allow authenticated read on consultation_requests"
  ON public.consultation_requests
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated users (admin) can update
CREATE POLICY "Allow authenticated update on consultation_requests"
  ON public.consultation_requests
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Only authenticated users (admin) can delete
CREATE POLICY "Allow authenticated delete on consultation_requests"
  ON public.consultation_requests
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.consultation_requests TO authenticated;
GRANT INSERT ON public.consultation_requests TO anon;
