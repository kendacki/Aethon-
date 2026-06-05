CREATE TABLE IF NOT EXISTS indexer_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  last_block BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  address TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  stake TEXT NOT NULL DEFAULT '0',
  reputation INTEGER NOT NULL DEFAULT 100,
  online BOOLEAN NOT NULL DEFAULT false,
  last_heartbeat TIMESTAMPTZ,
  metadata_uri TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY,
  submitter TEXT NOT NULL,
  task_hash TEXT NOT NULL,
  reward TEXT NOT NULL,
  complexity INTEGER NOT NULL,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING',
  coalition_addr TEXT,
  authorized_reporter TEXT,
  platform_fee TEXT,
  tx_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coalitions (
  address TEXT PRIMARY KEY,
  members JSONB NOT NULL DEFAULT '[]',
  lead_agent TEXT NOT NULL,
  task_id BIGINT NOT NULL,
  dissolved BOOLEAN NOT NULL DEFAULT false,
  total_stake TEXT NOT NULL DEFAULT '0',
  formed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reputation_events (
  id SERIAL PRIMARY KEY,
  agent TEXT NOT NULL,
  old_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  reason TEXT NOT NULL,
  block_number BIGINT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_outbox (
  id SERIAL PRIMARY KEY,
  submitter TEXT NOT NULL,
  task_hash TEXT NOT NULL,
  complexity INTEGER NOT NULL,
  reward_wei TEXT NOT NULL,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  on_chain_task_id BIGINT,
  tx_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_submitter ON tasks(submitter);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_agents_online ON agents(online);
CREATE INDEX IF NOT EXISTS idx_coalitions_task ON coalitions(task_id);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON task_outbox(status);
CREATE INDEX IF NOT EXISTS idx_reputation_agent ON reputation_events(agent);

CREATE TABLE IF NOT EXISTS task_payloads (
  task_hash TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_coalition_intents (
  task_id BIGINT NOT NULL,
  agent_address TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, agent_address)
);

CREATE TABLE IF NOT EXISTS task_skill_results (
  task_id BIGINT NOT NULL,
  agent_address TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, agent_address)
);

CREATE INDEX IF NOT EXISTS idx_coalition_intents_task ON task_coalition_intents(task_id);
CREATE INDEX IF NOT EXISTS idx_skill_results_task ON task_skill_results(task_id);

-- Agent knowledge base (RAG via PostgreSQL full-text search)
CREATE TABLE IF NOT EXISTS agent_knowledge (
  id SERIAL PRIMARY KEY,
  agent_role TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  search_vector tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_role ON agent_knowledge(agent_role);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_search ON agent_knowledge USING GIN(search_vector);

-- Warm memory: observations from completed skills (used for retrieval context)
CREATE TABLE IF NOT EXISTS agent_observations (
  id SERIAL PRIMARY KEY,
  agent_role TEXT NOT NULL,
  task_id BIGINT,
  observation_type TEXT NOT NULL DEFAULT 'skill_outcome',
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_observations_role ON agent_observations(agent_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_observations_task ON agent_observations(task_id);
