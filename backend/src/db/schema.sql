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
