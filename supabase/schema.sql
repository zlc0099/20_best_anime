-- 番单站匿名统计：一次提交只存年份 + 作品 id，不存昵称。

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  visitor uuid not null,
  fingerprint text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.submission_picks (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  year int not null check (year between 1990 and 2026),
  anime_id int not null check (anime_id > 0),
  primary key (submission_id, year)
);

create index if not exists submission_picks_year_anime_idx
  on public.submission_picks (year, anime_id);

alter table public.submissions enable row level security;
alter table public.submission_picks enable row level security;

revoke all on public.submissions from anon, authenticated;
revoke all on public.submission_picks from anon, authenticated;

create or replace function public.submit_picks(p_visitor uuid, p_picks jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_fingerprint text;
  v_submission uuid;
begin
  if p_visitor is null or jsonb_typeof(p_picks) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select count(*) into v_count from jsonb_array_elements(p_picks);
  if v_count < 10 or v_count > 20 then
    return jsonb_build_object('ok', false, 'reason', 'count');
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_picks) as e
    where jsonb_typeof(e) <> 'object'
       or coalesce(e->>'year', '') !~ '^[0-9]{4}$'
       or coalesce(e->>'anime_id', '') !~ '^[0-9]{1,9}$'
       or (e->>'year')::int not between 1990 and 2026
       or (e->>'anime_id')::int <= 0
  ) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if (
    select count(distinct (e->>'year')::int)
    from jsonb_array_elements(p_picks) as e
  ) <> v_count then
    return jsonb_build_object('ok', false, 'reason', 'duplicate_year');
  end if;

  select md5(
    p_visitor::text || '|' ||
    string_agg(
      (e->>'year')::int || ':' || (e->>'anime_id')::int,
      ',' order by (e->>'year')::int
    )
  )
  into v_fingerprint
  from jsonb_array_elements(p_picks) as e;

  insert into public.submissions (visitor, fingerprint)
  values (p_visitor, v_fingerprint)
  on conflict (fingerprint) do nothing
  returning id into v_submission;

  if v_submission is null then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  insert into public.submission_picks (submission_id, year, anime_id)
  select v_submission, (e->>'year')::int, (e->>'anime_id')::int
  from jsonb_array_elements(p_picks) as e;

  return jsonb_build_object('ok', true, 'duplicate', false);
end;
$$;

revoke execute on function public.submit_picks(uuid, jsonb) from public;
grant execute on function public.submit_picks(uuid, jsonb) to anon;

create or replace function public.decade_top()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
with picks as (
  select year, anime_id, submission_id from public.submission_picks
),
totals as (
  select (year / 10) * 10 as decade, count(*)::numeric as total_picks
  from picks group by 1
),
ranked as (
  select (year / 10) * 10 as decade, anime_id, min(year) as year, count(*)::numeric as picks
  from picks group by 1, 2
),
top as (
  select decade, anime_id, year, picks,
         row_number() over (partition by decade order by picks desc, anime_id) as rn
  from ranked
)
select jsonb_build_object(
  'submissions', (select count(*) from public.submissions),
  'decades', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'decade', t.decade,
        'total_picks', t.total_picks,
        'submissions', (
          select count(distinct p.submission_id)
          from picks p
          where (p.year / 10) * 10 = t.decade
        ),
        'top', (
          select jsonb_agg(
            jsonb_build_object(
              'anime_id', x.anime_id,
              'year', x.year,
              'picks', x.picks,
              'share', round(x.picks / t.total_picks * 100, 1)
            ) order by x.rn
          )
          from top x
          where x.decade = t.decade and x.rn <= 10
        )
      ) order by t.decade
    )
    from totals t
  ), '[]'::jsonb)
);
$$;

revoke execute on function public.decade_top() from public;
grant execute on function public.decade_top() to anon;
