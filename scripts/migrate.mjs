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
  client_id TEXT NOT NULL,
  child_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_profiles_parent ON child_profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_lessons_filter ON lessons(language, level, min_age, max_age, subject);
CREATE INDEX IF NOT EXISTS idx_progress_child ON learning_progress(child_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_client ON sync_events(client_id, id);

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
