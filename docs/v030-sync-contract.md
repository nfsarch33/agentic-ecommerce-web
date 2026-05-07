# v0.3.0 Sync API Contract

The frontend implementation is generated from the backend `api/openapi.yaml` with `bun run api:generate`.

## `GET /api/v1/sync/status`

Returns the current sync worker status.

```json
{
  "total_events": 3,
  "pending_conflicts": 1,
  "last_event": {
    "id": "event_1",
    "type": "conflict_detected",
    "product_id": "p_1",
    "remote_id": 44,
    "created_at": "2026-05-07T04:30:00Z"
  },
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
      "product_id": "p_1",
      "sku": "SKU-1",
      "remote_id": 44,
      "status": "pending",
      "fields": [
        {
          "field": "price",
          "local_value": "3500",
          "remote_value": "3999"
        }
      ],
      "created_at": "2026-05-07T04:26:00Z"
    }
  ]
}
```

`status` is `pending` or `resolved`. Conflict fields are `title`, `price`, `stock`, or `description`.

## `POST /api/v1/sync/conflicts/{id}/resolve`

Request:

```json
{
  "resolution": "local | remote | manual"
}
```

Response:

```json
{
  "id": "conflict_1",
  "sku": "SKU-1",
  "remote_id": 44,
  "status": "resolved",
  "fields": [],
  "resolution": "remote",
  "created_at": "2026-05-07T04:26:00Z",
  "resolved_at": "2026-05-07T04:40:00Z"
}
```

SSE follow-up: replace the current polling hook with an EventSource stream once the backend exposes a stable sync events endpoint.
