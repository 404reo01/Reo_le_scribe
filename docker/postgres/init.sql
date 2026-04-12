CREATE TABLE IF NOT EXISTS rooms (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudo    VARCHAR(50) NOT NULL,
  room_id   UUID REFERENCES rooms(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores AI bookmark results (transcript + summary)
CREATE TABLE IF NOT EXISTS bookmarks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID REFERENCES rooms(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES users(id),
  transcript   TEXT,
  summary      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
