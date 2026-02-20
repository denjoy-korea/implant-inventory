-- 039: 사업자등록증 스토리지 접근 보강
-- - 누락된 biz-documents 버킷 자동 생성(이미 있으면 유지)
-- - 운영자(role=admin)가 모든 병원의 증빙 파일을 조회할 수 있도록 SELECT 정책 추가

INSERT INTO storage.buckets (id, name, public)
VALUES ('biz-documents', 'biz-documents', false)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'admins_view_all_biz_docs'
  ) THEN
    CREATE POLICY "admins_view_all_biz_docs" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'biz-documents'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      );
  END IF;
END
$$;
