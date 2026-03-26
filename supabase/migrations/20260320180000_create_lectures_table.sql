-- 동영상 강의 테이블
create table if not exists lectures (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  youtube_url  text not null,          -- 유튜브 일부공개 URL (embed용 video_id 파싱)
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 시스템 어드민만 write, 인증된 회원 전체 read
alter table lectures enable row level security;

drop policy if exists "lectures_select" on lectures;
create policy "lectures_select" on lectures
  for select to authenticated using (true);

drop policy if exists "lectures_insert" on lectures;
create policy "lectures_insert" on lectures
  for insert to service_role with check (true);

drop policy if exists "lectures_update" on lectures;
create policy "lectures_update" on lectures
  for update to service_role using (true);

drop policy if exists "lectures_delete" on lectures;
create policy "lectures_delete" on lectures
  for delete to service_role using (true);

-- 초기 샘플 데이터 (필요 시 삭제)
-- insert into lectures (title, description, youtube_url, sort_order) values
--   ('DenJOY 시작하기', '재고관리 첫 설정 방법을 안내합니다.', 'https://www.youtube.com/watch?v=XXXXXXXXXXX', 1);
