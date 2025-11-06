-- Enable RLS on all tables
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for parties table
CREATE POLICY "Allow public read access to parties"
ON public.parties
FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to manage parties"
ON public.parties
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for banners table
CREATE POLICY "Allow public read access to banners"
ON public.banners
FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to manage banners"
ON public.banners
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for audit_logs table
CREATE POLICY "Allow authenticated users to insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (true);

-- Service role has full access to all tables
CREATE POLICY "Service role has full access to parties"
ON public.parties
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to banners"
ON public.banners
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to audit logs"
ON public.audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
