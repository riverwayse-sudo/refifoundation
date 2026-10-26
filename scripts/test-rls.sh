#!/usr/bin/env bash
# Runs the CMS row-level security tests against a throwaway PostgreSQL container.
#
# Uses Docker so the tests exercise real PostgreSQL policies rather than mocks.
# Skips cleanly (exit 0) when Docker is unavailable, so the test never blocks
# contributors who cannot run containers; CI is expected to have Docker.
set -uo pipefail

CONTAINER="${REFI_PG_CONTAINER:-refi-pg-test}"
PORT="${REFI_PG_PORT:-55432}"
IMAGE="${REFI_PG_IMAGE:-postgres:16-alpine}"

if ! command -v docker >/dev/null 2>&1; then
  echo "SKIP: docker not available, RLS tests not run"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "SKIP: docker daemon not reachable, RLS tests not run"
  exit 0
fi

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup

if ! docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=refi \
  -p "${PORT}:5432" "$IMAGE" >/dev/null 2>&1; then
  echo "SKIP: could not start PostgreSQL container, RLS tests not run"
  exit 0
fi

# Wait for PostgreSQL to accept connections.
#
# The official image runs a temporary server on the unix socket while it
# initialises, so `pg_isready` over the socket reports ready before the real
# server exists; a query then fails against a socket that has gone away. Require
# a real query over TCP instead, which only the final server answers.
ready=0
for _ in $(seq 1 90); do
  if docker exec "$CONTAINER" psql -U postgres -d refi -h 127.0.0.1 -tAc 'select 1' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "FAIL: PostgreSQL did not become ready"
  exit 1
fi

run_sql() {
  docker exec -i "$CONTAINER" psql -U postgres -d refi -h 127.0.0.1 -v ON_ERROR_STOP=1 -q -f - < "$1"
}

status=0

if ! run_sql supabase/tests/00_stubs.sql; then
  echo "FAIL: could not create Supabase stubs"
  exit 1
fi

if ! run_sql supabase/migrations/0001_cms_schema.sql; then
  echo "FAIL: migration did not apply cleanly"
  exit 1
fi

if ! docker exec -i "$CONTAINER" psql -U postgres -d refi -h 127.0.0.1 -v ON_ERROR_STOP=1 < supabase/tests/10_rls.sql; then
  echo "FAIL: RLS tests failed"
  status=1
fi

if [ "$status" -eq 0 ]; then
  echo "PASS: RLS tests"
fi

exit "$status"
