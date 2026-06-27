create table if not exists wells (
  id text primary key,
  name text not null,
  zone text not null,
  status text not null check (status in ('producing', 'maintenance', 'shutdown')),
  depth numeric not null,
  pump_depth numeric not null,
  pump_efficiency numeric not null,
  dynamic_level numeric not null,
  submergence numeric not null,
  current_value numeric not null,
  load_value numeric not null,
  stroke_rate numeric not null,
  stroke_length numeric not null,
  back_pressure numeric not null,
  daily_oil numeric not null,
  daily_water numeric not null,
  water_cut numeric not null,
  last_overhaul date not null,
  reservoir_pressure numeric not null,
  bubble_point_pressure numeric not null,
  aof numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dynamic_level_readings (
  id bigserial primary key,
  well_id text not null references wells(id) on delete cascade,
  hour_index integer not null check (hour_index >= 0 and hour_index <= 23),
  level_value numeric not null,
  created_at timestamptz not null default now(),
  unique (well_id, hour_index)
);

create table if not exists optimization_records (
  id bigserial primary key,
  well_id text not null references wells(id) on delete cascade,
  record_date date not null,
  prev_depth numeric not null,
  new_depth numeric not null,
  delta numeric not null,
  reason text not null,
  effect text not null,
  status text not null check (status in ('success', 'warning', 'danger')),
  created_at timestamptz not null default now()
);

create table if not exists deepen_plans (
  id bigserial primary key,
  well_id text not null references wells(id) on delete cascade,
  deepen_amount numeric not null,
  current_pump_depth numeric not null,
  new_pump_depth numeric not null,
  current_efficiency numeric not null,
  estimated_efficiency numeric not null,
  efficiency_gain numeric not null,
  current_oil numeric not null,
  estimated_oil numeric not null,
  oil_gain numeric not null,
  current_submergence numeric not null,
  estimated_submergence numeric not null,
  safety_factor text not null,
  created_at timestamptz not null default now()
);
