-- =============================================================================
-- RLS Auth Initialization Plan 성능 경고 일괄 해소
--
-- 문제: RLS 정책에서 auth.uid() / auth.role()을 직접 사용하면
--       PostgreSQL이 각 행마다 함수를 재실행함 → 불필요한 반복 호출
--
-- 수정: (SELECT auth.uid()) / (SELECT auth.role()) 로 감싸면
--       쿼리당 한 번만 실행하고 결과를 캐시함 (init plan 최적화)
--
-- 참고: SECURITY DEFINER 함수 body 내 auth.uid()는 해당 없음 (행 단위 평가 아님)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- member_invitations
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "master can cancel own hospital invitations" ON member_invitations;
CREATE POLICY "master can cancel own hospital invitations"
  ON member_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hospitals h
      WHERE h.id = member_invitations.hospital_id
        AND h.master_admin_id = (SELECT auth.uid())
    )
    AND status = 'pending'
  )
  WITH CHECK (
    status IN ('pending', 'expired')
    AND EXISTS (
      SELECT 1 FROM hospitals h
      WHERE h.id = member_invitations.hospital_id
        AND h.master_admin_id = (SELECT auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "master_manage_members" ON profiles;
CREATE POLICY "master_manage_members"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    hospital_id IN (
      SELECT h.id FROM hospitals h WHERE h.master_admin_id = (SELECT auth.uid())
    )
    AND id != (SELECT auth.uid())
  )
  WITH CHECK (
    hospital_id IN (
      SELECT h.id FROM hospitals h WHERE h.master_admin_id = (SELECT auth.uid())
    )
    AND role = 'dental_staff'
    AND status IN ('active', 'inactive')
  );

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = get_my_role()
    AND status = get_my_status()
    AND (
      hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
      OR (
        get_my_hospital_id() IS NULL
        AND is_my_own_hospital(hospital_id)
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- operation_logs
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "operation_logs_insert" ON operation_logs;
CREATE POLICY "operation_logs_insert"
  ON operation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      hospital_id IN (
        SELECT hospital_id FROM profiles
        WHERE id = (SELECT auth.uid())
          AND status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (SELECT auth.uid())
          AND role = 'admin'
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- withdrawal_reasons
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_select_withdrawal_reasons" ON withdrawal_reasons;
CREATE POLICY "admin_select_withdrawal_reasons"
  ON withdrawal_reasons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'system_admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- page_views
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "page_views_select_admin_only" ON public.page_views;
CREATE POLICY "page_views_select_admin_only" ON public.page_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "page_views_delete_admin_only" ON public.page_views;
CREATE POLICY "page_views_delete_admin_only" ON public.page_views
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "page_views_update_convert" ON public.page_views;
CREATE POLICY "page_views_update_convert" ON public.page_views
  FOR UPDATE TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- system_integrations
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "system_admin_only_select" ON public.system_integrations;
CREATE POLICY "system_admin_only_select" ON public.system_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "system_admin_only_insert" ON public.system_integrations;
CREATE POLICY "system_admin_only_insert" ON public.system_integrations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "system_admin_only_update" ON public.system_integrations;
CREATE POLICY "system_admin_only_update" ON public.system_integrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "system_admin_only_delete" ON public.system_integrations;
CREATE POLICY "system_admin_only_delete" ON public.system_integrations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- beta_invite_codes
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "beta_invite_codes_admin_select" ON public.beta_invite_codes;
CREATE POLICY "beta_invite_codes_admin_select"
  ON public.beta_invite_codes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "beta_invite_codes_admin_insert" ON public.beta_invite_codes;
CREATE POLICY "beta_invite_codes_admin_insert"
  ON public.beta_invite_codes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "beta_invite_codes_admin_update" ON public.beta_invite_codes;
CREATE POLICY "beta_invite_codes_admin_update"
  ON public.beta_invite_codes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "beta_invite_codes_admin_delete" ON public.beta_invite_codes;
CREATE POLICY "beta_invite_codes_admin_delete"
  ON public.beta_invite_codes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- analysis_leads
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_select_analysis_leads" ON analysis_leads;
CREATE POLICY "admin_select_analysis_leads"
  ON analysis_leads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- vendor_contacts
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_members_vendor_contacts" ON vendor_contacts;
CREATE POLICY "hospital_members_vendor_contacts" ON vendor_contacts
  FOR ALL TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND hospital_id IS NOT NULL
    )
  )
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM profiles
      WHERE id = (SELECT auth.uid()) AND hospital_id IS NOT NULL
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- access_logs
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "access_logs_select" ON access_logs;
CREATE POLICY "access_logs_select"
  ON access_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('master', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- storage.objects (public-assets bucket)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin Insert Access to site assets" ON storage.objects;
CREATE POLICY "Admin Insert Access to site assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin Update Access to site assets" ON storage.objects;
CREATE POLICY "Admin Update Access to site assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'public-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin Delete Access to site assets" ON storage.objects;
CREATE POLICY "Admin Delete Access to site assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'public-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- consultation_requests
-- auth.role() → (SELECT auth.role()) 또는 TO authenticated 절로 대체
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated read on consultation_requests" ON public.consultation_requests;
CREATE POLICY "Allow authenticated read on consultation_requests"
  ON public.consultation_requests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated update on consultation_requests" ON public.consultation_requests;
CREATE POLICY "Allow authenticated update on consultation_requests"
  ON public.consultation_requests FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete on consultation_requests" ON public.consultation_requests;
CREATE POLICY "Allow authenticated delete on consultation_requests"
  ON public.consultation_requests FOR DELETE
  TO authenticated
  USING (true);
