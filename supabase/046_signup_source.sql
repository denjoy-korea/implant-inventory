-- profiles 테이블에 가입경로 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_source TEXT;
