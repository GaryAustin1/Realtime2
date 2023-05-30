drop table if exists realtest;
create table realtest (
                          id            int8    primary key,
                          message       text,
                          created_at    timestamptz      not null     default now()
);
alter publication supabase_realtime add table realtest;


