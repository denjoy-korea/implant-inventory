-- 046: contact_inquiries 익명 INSERT 권한 부여
-- anon 롤이 RLS 통과 전에 기본 테이블 권한도 필요

GRANT INSERT ON contact_inquiries TO anon;
GRANT INSERT ON contact_inquiries TO authenticated;

-- 관리자용 조회/수정/삭제 권한
GRANT SELECT, UPDATE, DELETE ON contact_inquiries TO authenticated;
