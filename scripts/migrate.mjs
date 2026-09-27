import pg from "pg";
const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set; skipping database migration.");
  process.exit(0);
}

const pool = new Pool({ connectionString: url, ssl: false });
const sql = `
CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  pi_uid TEXT UNIQUE,
  username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS child_profiles (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age BETWEEN 3 AND 17),
  preferred_language TEXT NOT NULL DEFAULT 'vi',
  level INTEGER NOT NULL DEFAULT 1,
  ai_teacher TEXT NOT NULL DEFAULT 'Jenna',
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  license TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'internal',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  min_age INTEGER NOT NULL,
  max_age INTEGER NOT NULL,
  level INTEGER NOT NULL,
  language TEXT NOT NULL,
  source_id TEXT REFERENCES curriculum_sources(id),
  version INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_progress (
  id BIGSERIAL PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id),
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  skill_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_log (
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_id, child_id, permission)
);

CREATE TABLE IF NOT EXISTS learning_passport (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_events (
  id BIGSERIAL PRIMARY KEY,
  event_uuid TEXT UNIQUE,
  client_id TEXT NOT NULL,
  child_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  apply_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_child_profiles_parent ON child_profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_lessons_filter ON lessons(language, level, min_age, max_age, subject);
CREATE INDEX IF NOT EXISTS idx_progress_child ON learning_progress(child_id, completed_at DESC);
ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS event_uuid TEXT;
ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS applied BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS apply_error TEXT;
ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_event_uuid ON sync_events(event_uuid) WHERE event_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sync_client ON sync_events(client_id, id);


ALTER TABLE child_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE child_profiles ADD COLUMN IF NOT EXISTS interests JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE child_profiles ADD COLUMN IF NOT EXISTS strengths JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE child_profiles ADD COLUMN IF NOT EXISTS support_needs JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE child_profiles ADD COLUMN IF NOT EXISTS learning_style TEXT NOT NULL DEFAULT 'mixed';
ALTER TABLE child_profiles ADD COLUMN IF NOT EXISTS current_ability JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  age INTEGER NOT NULL CHECK (age BETWEEN 3 AND 9),
  framework_version INTEGER NOT NULL DEFAULT 1,
  weekly_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  monthly_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL,
  subject TEXT,
  age INTEGER NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  skill_mastery JSONB NOT NULL DEFAULT '{}'::jsonb,
  level_label TEXT NOT NULL DEFAULT 'Beginning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_sessions (
  id BIGSERIAL PRIMARY KEY,
  child_id TEXT REFERENCES child_profiles(id) ON DELETE SET NULL,
  teacher TEXT NOT NULL,
  subject TEXT,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  provider TEXT,
  model TEXT,
  latency_ms INTEGER,
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  user_message TEXT,
  assistant_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_sessions (
  id BIGSERIAL PRIMARY KEY,
  child_id TEXT REFERENCES child_profiles(id) ON DELETE SET NULL,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  mode TEXT NOT NULL,
  language TEXT NOT NULL,
  transcript TEXT,
  score NUMERIC(5,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent_reports (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id TEXT REFERENCES child_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_child ON learning_paths(child_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_child ON assessments(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_child ON ai_sessions(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_child ON voice_sessions(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_child ON achievements(child_id, awarded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_child ON parent_reports(child_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_parent ON notifications(parent_id, created_at DESC);



INSERT INTO curriculum_sources(id,name,url,license,source_type,enabled)
VALUES
 ('littlecat-vn','LittleCat.vn','https://littlecat.vn','Rights not verified; metadata/deep-link only','external-reference',TRUE)
ON CONFLICT (id) DO UPDATE SET
 name=EXCLUDED.name,
 url=EXCLUDED.url,
 license=EXCLUDED.license,
 source_type=EXCLUDED.source_type,
 enabled=TRUE,
 updated_at=NOW();

INSERT INTO curriculum_sources(id,name,url,license,source_type)
VALUES
 ('core-internal','AI HomeSchool Core',NULL,'Original / internally authored','internal'),
 ('oer-feed','Approved OER Feed Registry',NULL,'Only public-domain/open-license/licensed feeds','connector')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons(id,subject,title,min_age,max_age,level,language,source_id,version,content,skills)
VALUES
 ('en-colors-1','Language','Colors & Objects',5,8,2,'en','core-internal',1,
  '{"objective":"Recognize and say basic colors","steps":[{"type":"listen","text":"Red, blue, yellow"},{"type":"choice","prompt":"Find the red object","options":["Red Apple","Blue Berry","Yellow Banana"],"answer":0},{"type":"speak","text":"This is a red apple."}]}'::jsonb,
  '["listening","speaking","vocabulary"]'::jsonb),
 ('vi-toan-1','Mathematics','Cộng trong phạm vi 10',5,8,2,'vi','core-internal',1,
  '{"objective":"Cộng hai số nhỏ","steps":[{"type":"choice","prompt":"3 + 2 = ?","options":["4","5","6"],"answer":1},{"type":"explain","text":"Ba cộng hai bằng năm."}]}'::jsonb,
  '["numeracy","logic"]'::jsonb),
 ('zh-basic-1','Language','颜色入门',6,9,2,'zh','core-internal',1,
  '{"objective":"认识基础颜色","steps":[{"type":"listen","text":"红色，蓝色，黄色"},{"type":"choice","prompt":"哪个是红色？","options":["红色","蓝色","黄色"],"answer":0}]}'::jsonb,
  '["listening","reading","vocabulary"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
`;

try {
  await pool.query(sql);
  console.log("[migrate] schema ready");
} finally {
  await pool.end();
}
