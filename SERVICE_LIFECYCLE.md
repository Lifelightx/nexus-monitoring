# Service Lifecycle Management Strategy

## Overview
Services should follow a 3-state lifecycle: ACTIVE → INACTIVE → DELETED

## States

### 1. ACTIVE
- **Condition**: Service is sending traces/heartbeats
- **UI Display**: Show normally with green indicator
- **Data Retention**: Keep all traces and metrics
- **Action**: None

### 2. INACTIVE
- **Condition**: No heartbeat/trace for 5-10 minutes
- **UI Display**: Show with gray/yellow indicator, "Last seen X minutes ago"
- **Data Retention**: Keep all historical data
- **Action**: Mark as inactive, but keep visible
- **Duration**: Keep for 7-30 days (configurable)

### 3. DELETED
- **Condition**: Inactive for 7-30 days
- **UI Display**: Hide from main list, show in "Deleted Services" archive
- **Data Retention**: Keep traces for compliance (optional)
- **Action**: Soft delete (set deleted_at timestamp)

## Database Schema

```javascript
{
  name: "nodejs-3001",
  status: "ACTIVE" | "INACTIVE" | "DELETED",
  first_seen: Date,
  last_seen: Date,
  deleted_at: Date | null,
  inactive_since: Date | null
}
```

## Backend Logic

### Auto-Transition to INACTIVE
Run every 1 minute:
```javascript
// Mark services as INACTIVE if no heartbeat for 10 minutes
const inactiveThreshold = new Date(Date.now() - 10 * 60 * 1000);
await Service.updateMany(
  {
    status: 'ACTIVE',
    last_seen: { $lt: inactiveThreshold }
  },
  {
    status: 'INACTIVE',
    inactive_since: new Date()
  }
);
```

### Auto-Transition to DELETED
Run every 1 hour:
```javascript
// Mark services as DELETED if inactive for 30 days
const deletionThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
await Service.updateMany(
  {
    status: 'INACTIVE',
    inactive_since: { $lt: deletionThreshold }
  },
  {
    status: 'DELETED',
    deleted_at: new Date()
  }
);
```

## Frontend Display

### Main Services List
- Show ACTIVE and INACTIVE services
- Filter: "All" | "Active" | "Inactive"
- Visual indicator for status

### Deleted Services Archive
- Separate page/tab for DELETED services
- Option to permanently purge

## Configuration (Environment Variables)

```bash
# How long before marking service as INACTIVE (minutes)
INACTIVE_THRESHOLD=10

# How long before marking service as DELETED (days)
DELETION_THRESHOLD=30

# Whether to permanently purge deleted services
PURGE_DELETED_SERVICES=false
```

## Development vs Production

### Development
- **INACTIVE_THRESHOLD**: 5 minutes (services restart often)
- **DELETION_THRESHOLD**: 1 day (faster cleanup)
- **Manual Cleanup**: Provide "Clear All Inactive" button

### Production
- **INACTIVE_THRESHOLD**: 10 minutes
- **DELETION_THRESHOLD**: 30 days (compliance, debugging)
- **Manual Cleanup**: Require admin approval

## Benefits

✅ **No Data Loss** - Historical traces preserved
✅ **Easy Debugging** - Can investigate stopped services
✅ **Clean UI** - Inactive services visually distinct
✅ **Compliance** - Retain data for auditing
✅ **Flexibility** - Configurable thresholds

## Implementation Priority

**For MVP (Now):**
1. Add `status` field to Service model
2. Mark services INACTIVE after 10 min
3. Filter INACTIVE services in UI

**For V1 (Later):**
1. Add DELETED state
2. Implement auto-cleanup scheduler
3. Add "Deleted Services" archive page
4. Add manual cleanup controls

## Recommendation for Development

**Right now:**
- Keep services visible even when stopped
- Add visual indicator (gray/inactive badge)
- Add "Last seen X minutes ago" timestamp
- Provide manual "Delete Service" button for cleanup

**Don't:**
- Auto-delete services immediately
- Hide stopped services completely
- Lose historical trace data
