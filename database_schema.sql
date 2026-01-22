-- Create the database (run this first)
CREATE DATABASE url_shortener;

-- Connect to the database
\c url_shortener;

-- Create urls table
CREATE TABLE urls (
    id SERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    click_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP
);

-- Create index on short_code for faster lookups
CREATE INDEX idx_short_code ON urls(short_code);

-- Create index on created_at for analytics
CREATE INDEX idx_created_at ON urls(created_at);

-- Optional: Create a table for click analytics
CREATE TABLE clicks (
    id SERIAL PRIMARY KEY,
    short_code VARCHAR(10) REFERENCES urls(short_code),
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT
);

CREATE INDEX idx_clicks_short_code ON clicks(short_code);
CREATE INDEX idx_clicks_timestamp ON clicks(clicked_at);