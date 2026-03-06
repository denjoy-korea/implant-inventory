-- Fix consultation_requests RLS: restrict SELECT/UPDATE/DELETE to admin only
-- Previously USING(true) allowed any authenticated user to view/modify all rows.
-- This table stores PII (name, email, phone, notes) from landing page consultation form.
-- Only system admins should manage these requests.

DROP POLICY IF EXISTS "Allow authenticated read on consultation_requests" ON public.consultation_requests;
DROP POLICY IF EXISTS "Allow authenticated update on consultation_requests" ON public.consultation_requests;
DROP POLICY IF EXISTS "Allow authenticated delete on consultation_requests" ON public.consultation_requests;

CREATE POLICY "consultation_requests_admin_select"
  ON public.consultation_requests FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "consultation_requests_admin_update"
  ON public.consultation_requests FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "consultation_requests_admin_delete"
  ON public.consultation_requests FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');
