-- 0002의 `in schema public` 회수는 PostgreSQL이 전역으로 주는 PUBLIC EXECUTE 기본값을 지우지 못한다.
-- 스키마 없이 전역으로 회수해야 앞으로 만드는 함수가 PUBLIC(=anon 포함)에 열리지 않는다.
alter default privileges for role postgres revoke execute on functions from public;
