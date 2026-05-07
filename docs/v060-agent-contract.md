# v0.6.0 Agent API Contract

The frontend implementation targets the backend contract below until the v0.6.0 backend OpenAPI PR is merged and `bun run api:generate` can refresh `src/lib/adapters/api/generated/schema.d.ts`.

## Types

`kind` is one of `sourcing`, `content`, `pricing`, or `compliance`.

`status` is one of `idle`, `queued`, `running`, `succeeded`, `failed`, or `disabled`.

`trigger` is one of `manual`, `scheduled`, or `event`.

## `GET /api/v1/agents`

Returns registered agents and their current scheduler state.

```json
{
  "agents": [
    {
      "id": "agent_sourcing",
      "kind": "sourcing",
      "name": "Sourcing Agent",
      "description": "Finds supplier opportunities from configured feeds.",
      "status": "running",
      "last_run_at": "2026-05-07T04:20:00Z",
      "next_run_at": "2026-05-07T05:00:00Z",
      "last_run_status": "succeeded",
      "in_flight_runs": 1,
      "queued_runs": 2,
      "success_rate": 0.82,
      "updated_at": "2026-05-07T04:31:00Z"
    }
  ]
}
```

`success_rate` is a decimal between `0` and `1`.

## `POST /api/v1/agents/{id}/run`

Queues a manual run for an agent. The frontend sends a body so future trigger modes can be added without changing the endpoint.

Request:

```json
{
  "trigger": "manual"
}
```

Response:

```json
{
  "run": {
    "id": "run_2",
    "agent_id": "agent_sourcing",
    "status": "queued",
    "trigger": "manual",
    "summary": "Manual run queued by operator.",
    "created_at": "2026-05-07T04:32:00Z"
  }
}
```

The frontend accepts either `202 Accepted` or any successful 2xx status.

## `GET /api/v1/agents/{id}/history`

Returns recent agent runs in reverse chronological order.

```json
{
  "runs": [
    {
      "id": "run_1",
      "agent_id": "agent_sourcing",
      "status": "succeeded",
      "trigger": "manual",
      "started_at": "2026-05-07T04:20:00Z",
      "finished_at": "2026-05-07T04:21:30Z",
      "duration_ms": 90000,
      "summary": "Found three supplier candidates.",
      "input": { "category": "fitness" },
      "output": { "candidates": 3 },
      "created_at": "2026-05-07T04:20:00Z"
    }
  ]
}
```

SSE follow-up: replace the current polling hook with an EventSource stream once the backend exposes a stable agent status endpoint.
