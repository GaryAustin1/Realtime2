drop table if exists realtest;
create table realtest (
                          id            serial    primary key,
                          message       text,
                          created_at    timestamptz      not null     default now()
);

INSERT INTO realtest (message)
select 'before-'||x
from generate_series(1, 20) x;
alter publication supabase_realtime add table realtest;
