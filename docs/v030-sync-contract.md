# v0.3.0 Sync API Contract

The frontend implementation targets the backend contract below until the v0.3.0 backend OpenAPI PR is merged and `bun run api:generate` can refresh `src/lib/adapters/api/generated/schema.d.ts`.

## `GET /api/v1/sync/status`

Returns the current sync worker state.

```json
{
  "state": "idle | running | degraded | failed",
  "last_sync_at": "2026-05-07T04:30:00Z",
  "next_sync_at": "2026-05-07T04:35:00Z",
  "sync_lag_seconds": 18,
  "in_flight_jobs": 2,
  "queued_events": 7,
  "conflict_count": 1,
  "error_count": 0,
  "last_error": null,
  "updated_at": "2026-05-07T04:31:00Z"
}
```

## `GET /api/v1/sync/conflicts`

Returns conflicts waiting for manual review.

```json
{
  "conflicts": [
    {
      "id": "conflict_1",
      "resource_type": "product",
      "resource_id": "p_1",
      "field": "price.amount",
      "backend_value": 3500,
      "woocommerce_value": 3999,
      "local_updated_at": "2026-05-07T04:20:00Z",
      "remote_updated_at": "2026-05-07T04:25:00Z",
      "detected_at": "2026-05-07T04:26:00Z",
      "status": "open"
    }
  ]
}
```

`resource_type` is `product`, `order`, or `inventory`. `status` is `open` or `resolved`.

## `POST /api/v1/sync/conflicts/{id}/resolve`

Request:

```json
{
  "resolution": "accept_local | accept_remote | mark_resolved"
}
```

Response:

```json
{
  "conflict": {
    "id": "conflict_1",
    "resource_type": "product",
    "resource_id": "p_1",
    "field": "price.amount",
    "backend_value": 3500,
    "woocommerce_value": 3999,
    "local_updated_at": "2026-05-07T04:20:00Z",
    "remote_updated_at": "2026-05-07T04:25:00Z",
    "detected_at": "2026-05-07T04:26:00Z",
    "status": "resolved",
    "resolution": "accept_remote",
    "resolved_at": "2026-05-07T04:40:00Z"
  }
}
```

SSE follow-up: replace the current polling hook with an EventSource stream once the backend exposes a stable sync events endpoint.
