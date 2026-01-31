#!/bin/bash
# Clone remote database to local macOS PostgreSQL

# Environment file with remote credentials
ENV_FILE="./.env.local"
LOCAL_DB_NAME="postgres"
LOCAL_USER="test"
LOCAL_PASSWORD=""  # Homebrew usually has no password for local user
DUMP_FILE="./backup.dump"

# Use the PG 17 bin path we installed
PG_BIN="/opt/homebrew/opt/postgresql@17/bin"
PATH="$PG_BIN:$PATH"

echo "=== Syncing Remote Database to Local (macOS) ==="

# 1. Get remote URL
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found."
    exit 1
fi

REMOTE_URL=$(grep '^POSTGRES_URL=' "$ENV_FILE" | head -n 1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$REMOTE_URL" ]; then
    echo "Error: POSTGRES_URL not found in $ENV_FILE"
    exit 1
fi

# 2. Dump remote
echo "[1/3] Dumping remote database (17.2) to $DUMP_FILE ..."
pg_dump --dbname="$REMOTE_URL" --format=c --file="$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Remote dump failed."
    exit 1
fi

# 3. Restore to local
echo "[2/3] Restoring to local database '$LOCAL_DB_NAME'..."
export PGPASSWORD=$LOCAL_PASSWORD

# Terminate connections
echo "Terminating local connections..."
psql -h 127.0.0.1 -U $LOCAL_USER -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$LOCAL_DB_NAME' AND pid <> pg_backend_pid();" > /dev/null 2>&1

# Drop and Recreate
echo "Recreating local DB..."
dropdb --if-exists -h 127.0.0.1 -U $LOCAL_USER $LOCAL_DB_NAME
createdb -h 127.0.0.1 -U $LOCAL_USER $LOCAL_DB_NAME

if [ $? -ne 0 ]; then
    echo "Error: Failed to (re)create local database."
    exit 1
fi

echo "Restoring data..."
pg_restore -h 127.0.0.1 -U $LOCAL_USER -d $LOCAL_DB_NAME --no-owner --no-privileges --verbose "$DUMP_FILE" 2>/dev/null

# 4. Clean up
rm "$DUMP_FILE"

echo "[3/3] Done! Local database synced."
echo "New Local URL: postgres://$LOCAL_USER:$LOCAL_PASSWORD@127.0.0.1:5432/$LOCAL_DB_NAME"
