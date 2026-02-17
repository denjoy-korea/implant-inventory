-- ============================================
-- Supabase Storage 버킷 설정
-- ============================================

-- 사업자등록증 파일 (회원가입 시 업로드)
INSERT INTO storage.buckets (id, name, public)
VALUES ('biz-documents', 'biz-documents', false);

-- 엑셀 파일 백업 (선택적)
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-backups', 'excel-backups', false);

-- Storage RLS: 사용자별 폴더 격리
CREATE POLICY "users_upload_own_biz_doc" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'biz-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users_view_own_biz_doc" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'biz-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
