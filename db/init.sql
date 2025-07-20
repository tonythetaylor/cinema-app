-- Create cinema_user if it doesn't exist
DO
$$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cinema_user'
   ) THEN
      CREATE ROLE cinema_user WITH LOGIN PASSWORD 'cinema_secretpassword';
   END IF;
END
$$;

-- Grant privileges to cinema_user on the database
GRANT ALL PRIVILEGES ON DATABASE cinema TO cinema_user;

-- Optional: Set as owner of public schema
ALTER SCHEMA public OWNER TO cinema_user;

-- Optional: Grant usage on schema
GRANT ALL ON SCHEMA public TO cinema_user;