CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rating INT DEFAULT 1000, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE puzzle_seeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seed_date DATE NOT NULL, 
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD', 'SUPER_HARD')),
    initial_board JSONB NOT NULL, 
    cage_config JSONB NOT NULL, 
    random_seed VARCHAR(100) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(seed_date, difficulty) 
);

CREATE TABLE match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puzzle_seed_id UUID REFERENCES puzzle_seeds(id) ON DELETE SET NULL, 
    
    match_type VARCHAR(30) NOT NULL CHECK (match_type IN ('REALTIME_SAME', 'REALTIME_SEPARATE', 'ASYNC', 'PRACTICE')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD', 'SUPER_HARD')),
    
    is_win BOOLEAN NOT NULL DEFAULT FALSE,
    time_taken_ms INT, 
    
    replay_data JSONB, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_match_results_leaderboard 
ON match_results(puzzle_seed_id, is_win, time_taken_ms);

CREATE INDEX idx_match_results_user 
ON match_results(user_id, created_at DESC);
