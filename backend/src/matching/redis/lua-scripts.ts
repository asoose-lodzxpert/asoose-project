/**
 * Lua Scripts for Atomic Redis Operations
 *
 * Guarantees:
 * - Single active job per driver/rider
 * - Single pending job per driver/rider
 * - Ride & delivery isolation
 * - Safe under concurrent requests
 * - Idempotent operations
 */

/* ============================================================
   DRIVER SCRIPTS
   ============================================================ */
export const ATOMIC_LOCK_DRIVER = `
local driverId = ARGV[1]
local tripType = ARGV[2]
local tripId = ARGV[3]
local hexId = ARGV[4]
local ttl = tonumber(ARGV[5])

local statusKey = 'driver:' .. driverId .. ':status'
local pendingRideKey = 'driver:' .. driverId .. ':pendingRide'
local pendingDeliveryKey = 'driver:' .. driverId .. ':pendingDelivery'
local currentRideKey = 'driver:' .. driverId .. ':currentRide'
local currentDeliveryKey = 'driver:' .. driverId .. ':currentDelivery'
local hexDriversKey = 'hex:' .. hexId .. ':drivers'
local hexCountKey = 'hex:' .. hexId .. ':count'
local declinedKey = 'matching:' .. tripType .. ':' .. tripId .. ':declined'
local lockKey = 'lock:' .. tripType .. ':' .. tripId .. ':driver:' .. driverId

if redis.call('SISMEMBER', declinedKey, driverId) == 1 then
  return -1
end

if redis.call('GET', statusKey) ~= 'ONLINE' then
  return 0
end

if redis.call('GET', pendingRideKey)
   or redis.call('GET', pendingDeliveryKey)
   or redis.call('GET', currentRideKey)
   or redis.call('GET', currentDeliveryKey) then
  return 0
end

if redis.call('SISMEMBER', hexDriversKey, driverId) == 0 then
  return 0
end

local pendingKey = tripType == 'ride' and pendingRideKey or pendingDeliveryKey
redis.call('SETEX', pendingKey, ttl, tripId)
redis.call('SETEX', lockKey, ttl, '1')

redis.call('SREM', hexDriversKey, driverId)
local assignCnt = tonumber(redis.call('GET', hexCountKey)) or 0
if assignCnt > 0 then
  redis.call('DECR', hexCountKey)
end

return 1
`;

export const ATOMIC_ACCEPT_TRIP = `
local driverId = ARGV[1]
local tripType = ARGV[2]
local tripId = ARGV[3]

local statusKey = 'driver:' .. driverId .. ':status'
local pendingKey = 'driver:' .. driverId .. ':pending' .. (tripType == 'ride' and 'Ride' or 'Delivery')
local currentKey = 'driver:' .. driverId .. ':current' .. (tripType == 'ride' and 'Ride' or 'Delivery')
local lockKey = 'lock:' .. tripType .. ':' .. tripId .. ':driver:' .. driverId

if redis.call('GET', pendingKey) ~= tripId then
  return 0
end

redis.call('DEL', pendingKey)
redis.call('DEL', lockKey)
redis.call('SET', currentKey, tripId)
redis.call('SET', statusKey, 'ACTIVE')

return 1
`;

export const ATOMIC_DECLINE_TRIP = `
local driverId = ARGV[1]
local tripType = ARGV[2]
local tripId = ARGV[3]
local hexId = ARGV[4]
local declinedTtl = tonumber(ARGV[5])

local statusKey = 'driver:' .. driverId .. ':status'
local pendingKey = 'driver:' .. driverId .. ':pending' .. (tripType == 'ride' and 'Ride' or 'Delivery')
local lockKey = 'lock:' .. tripType .. ':' .. tripId .. ':driver:' .. driverId
local hexDriversKey = 'hex:' .. hexId .. ':drivers'
local hexCountKey = 'hex:' .. hexId .. ':count'
local declinedKey = 'matching:' .. tripType .. ':' .. tripId .. ':declined'

if redis.call('GET', pendingKey) ~= tripId then
  return 0
end

redis.call('DEL', pendingKey)
redis.call('DEL', lockKey)
redis.call('SADD', declinedKey, driverId)
redis.call('EXPIRE', declinedKey, declinedTtl)

if redis.call('GET', statusKey) == 'ONLINE' then
  redis.call('SADD', hexDriversKey, driverId)
  redis.call('INCR', hexCountKey)
end

return 1
`;

export const ATOMIC_COMPLETE_TRIP = `
local driverId = ARGV[1]
local tripType = ARGV[2]
local tripId = ARGV[3]
local hexId = ARGV[4]

local statusKey = 'driver:' .. driverId .. ':status'
local currentKey = 'driver:' .. driverId .. ':current' .. (tripType == 'ride' and 'Ride' or 'Delivery')
local hexDriversKey = 'hex:' .. hexId .. ':drivers'
local hexCountKey = 'hex:' .. hexId .. ':count'

if redis.call('GET', currentKey) ~= tripId then
  return 0
end

redis.call('DEL', currentKey)
redis.call('SET', statusKey, 'ONLINE')

if redis.call('SISMEMBER', hexDriversKey, driverId) == 0 then
  redis.call('SADD', hexDriversKey, driverId)
  redis.call('INCR', hexCountKey)
end

return 1
`;

export const ATOMIC_UPDATE_LOCATION = `
local driverId = ARGV[1]
local lat = ARGV[2]
local lng = ARGV[3]
local newHexId = ARGV[4]
local timestamp = ARGV[5]
local role     = ARGV[6]

local statusKey = 'driver:' .. driverId .. ':status'
local roleKey   = 'driver:' .. driverId .. ':role'
local hexKey = 'driver:' .. driverId .. ':hex'
local lastSeenKey = 'driver:' .. driverId .. ':lastSeen'
local locationKey = 'driver:' .. driverId .. ':location'
local pendingRideKey = 'driver:' .. driverId .. ':pendingRide'
local pendingDeliveryKey = 'driver:' .. driverId .. ':pendingDelivery'

local status = redis.call('GET', statusKey)

-- Driver app guarantees it only sends location when the driver is active;
-- if Redis disagrees (key expired, server restart, etc.) auto-restore to ONLINE.
if status ~= 'ONLINE' and status ~= 'ACTIVE' then
  -- Only restore if there is no active job; ACTIVE conflict would mean the key
  -- was stale but a job is still in flight — skip to avoid data corruption.
  local hasCurrent = redis.call('GET', 'driver:' .. driverId .. ':currentRide')
                  or redis.call('GET', 'driver:' .. driverId .. ':currentDelivery')
  if hasCurrent then
    -- Has an active job in Redis under a different status — treat as ACTIVE
    status = 'ACTIVE'
  else
    -- Restore to ONLINE
    redis.call('SET', statusKey, 'ONLINE')
    redis.call('SET', roleKey, role)
    status = 'ONLINE'
    -- Signal caller to emit online event and update geo/active sets
    -- We'll still fall through to update location, then return -1 at the end.
    redis.call('SET', locationKey, '{"lat":' .. lat .. ',"lng":' .. lng .. '}')
    redis.call('SET', lastSeenKey, timestamp)
    redis.call('SET', hexKey, newHexId)
    local hasPending = redis.call('GET', pendingRideKey) or redis.call('GET', pendingDeliveryKey)
    if not hasPending then
      redis.call('SADD', 'hex:' .. newHexId .. ':drivers', driverId)
      redis.call('INCR', 'hex:' .. newHexId .. ':count')
    end
    return -1  -- caller must emit online event + update geo-index + active-set
  end
end

redis.call('SET', locationKey, '{"lat":' .. lat .. ',"lng":' .. lng .. '}')
redis.call('SET', lastSeenKey, timestamp)

local oldHexId = redis.call('GET', hexKey)
redis.call('SET', hexKey, newHexId)

if status ~= 'ONLINE' then
  return 0
end

local hasPending = redis.call('GET', pendingRideKey) or redis.call('GET', pendingDeliveryKey)

if oldHexId ~= newHexId then
  if oldHexId then
    redis.call('SREM', 'hex:' .. oldHexId .. ':drivers', driverId)
    local oldCnt = tonumber(redis.call('GET', 'hex:' .. oldHexId .. ':count')) or 0
    if oldCnt > 0 then
      redis.call('DECR', 'hex:' .. oldHexId .. ':count')
    end
  end
  if not hasPending then
    redis.call('SADD', 'hex:' .. newHexId .. ':drivers', driverId)
    redis.call('INCR', 'hex:' .. newHexId .. ':count')
  end
  return 1
end

-- Same hex: self-heal if driver is missing from the set and has no active pending job
if not hasPending then
  if redis.call('SISMEMBER', 'hex:' .. newHexId .. ':drivers', driverId) == 0 then
    redis.call('SADD', 'hex:' .. newHexId .. ':drivers', driverId)
    redis.call('INCR', 'hex:' .. newHexId .. ':count')
    return 2
  end
end

return 0
`;

export const ATOMIC_SET_OFFLINE = `
local driverId = ARGV[1]

local statusKey = 'driver:' .. driverId .. ':status'
local hexKey = 'driver:' .. driverId .. ':hex'
local currentRideKey = 'driver:' .. driverId .. ':currentRide'
local currentDeliveryKey = 'driver:' .. driverId .. ':currentDelivery'

if redis.call('GET', currentRideKey) or redis.call('GET', currentDeliveryKey) then
  return 0
end

local hexId = redis.call('GET', hexKey)
if hexId then
  redis.call('SREM', 'hex:' .. hexId .. ':drivers', driverId)
  local offlineCnt = tonumber(redis.call('GET', 'hex:' .. hexId .. ':count')) or 0
  if offlineCnt > 0 then
    redis.call('DECR', 'hex:' .. hexId .. ':count')
  end
end

redis.call('DEL',
  'driver:' .. driverId .. ':pendingRide',
  'driver:' .. driverId .. ':pendingDelivery'
)

redis.call('SET', statusKey, 'OFFLINE')
return 1
`;

export const ATOMIC_SET_RIDER_OFFLINE = `
local riderId = ARGV[1]

local statusKey = 'rider:' .. riderId .. ':status'
local hexKey = 'rider:' .. riderId .. ':hex'
local currentDeliveryKey = 'rider:' .. riderId .. ':currentDelivery'
local pendingDeliveryKey = 'rider:' .. riderId .. ':pendingDelivery'

if redis.call('GET', currentDeliveryKey) then
  return 0
end

redis.call('DEL', pendingDeliveryKey)
redis.call('SET', statusKey, 'OFFLINE')
return 1
`;

export const ATOMIC_SET_ONLINE = `
local driverId = ARGV[1]
local hexId = ARGV[2]

local statusKey = 'driver:' .. driverId .. ':status'
local roleKey   = 'driver:' .. driverId .. ':role'
local hexKey = 'driver:' .. driverId .. ':hex'
local hexDriversKey = 'hex:' .. hexId .. ':drivers'
local hexCountKey = 'hex:' .. hexId .. ':count'

redis.call('SET', statusKey, 'ONLINE')
redis.call('SET', roleKey, 'DRIVER')
redis.call('SET', hexKey, hexId)

if redis.call('SISMEMBER', hexDriversKey, driverId) == 0 then
  redis.call('SADD', hexDriversKey, driverId)
  redis.call('INCR', hexCountKey)
end

return 1
`;

/* ============================================================
   RIDER DELIVERY SCRIPTS
   ============================================================ */
export const ATOMIC_ASSIGN_DELIVERY = `
local riderId = ARGV[1]
local jobId = ARGV[2]
local hexId = ARGV[3]
local ttl = tonumber(ARGV[4])

local statusKey = 'rider:' .. riderId .. ':status'
local pendingKey = 'rider:' .. riderId .. ':pendingDelivery'
local currentKey = 'rider:' .. riderId .. ':currentDelivery'
local hexRidersKey = 'hex:' .. hexId .. ':riders'
local lockKey = 'lock:delivery:' .. jobId .. ':rider:' .. riderId

if redis.call('GET', statusKey) ~= 'ONLINE' then
  return 0
end

if redis.call('GET', pendingKey) or redis.call('GET', currentKey) then
  return 0
end

redis.call('SETEX', pendingKey, ttl, jobId)
redis.call('SETEX', lockKey, ttl, '1')
redis.call('SREM', hexRidersKey, riderId)

return 1
`;

export const ATOMIC_DECLINE_DELIVERY = `
local riderId = ARGV[1]
local jobId = ARGV[2]
local hexId = ARGV[3]
local declinedTtl = tonumber(ARGV[4])

local statusKey = 'rider:' .. riderId .. ':status'
local pendingKey = 'rider:' .. riderId .. ':pendingDelivery'
local currentKey = 'rider:' .. riderId .. ':currentDelivery'
local lockKey = 'lock:delivery:' .. jobId .. ':rider:' .. riderId
local hexRidersKey = 'hex:' .. hexId .. ':riders'
local declinedKey = 'matching:delivery:' .. jobId .. ':declined'

if redis.call('GET', pendingKey) ~= jobId then
  return 0
end

redis.call('DEL', pendingKey)
redis.call('DEL', lockKey)
redis.call('SADD', declinedKey, riderId)
redis.call('EXPIRE', declinedKey, declinedTtl)

if redis.call('GET', statusKey) == 'ONLINE' then
  redis.call('SADD', hexRidersKey, riderId)
end

return 1
`;

export const ATOMIC_COMPLETE_DELIVERY = `
local riderId = ARGV[1]
local jobId = ARGV[2]
local hexId = ARGV[3]

local statusKey = 'rider:' .. riderId .. ':status'
local currentKey = 'rider:' .. riderId .. ':currentDelivery'
local hexRidersKey = 'hex:' .. hexId .. ':riders'

if redis.call('GET', currentKey) ~= jobId then
  return 0
end

redis.call('DEL', currentKey)
redis.call('SET', statusKey, 'ONLINE')
redis.call('SADD', hexRidersKey, riderId)

return 1
`;

/**
 * Atomically updates a rider's location, hex key, and hex-set membership.
 * Mirrors ATOMIC_UPDATE_LOCATION but uses rider:* keys and hex:*:riders sets.
 *
 * Returns:
 *  -1 — rider status is not ONLINE (update skipped)
 *   0 — same hex, already in set (no change needed)
 *   1 — hex changed, sets updated
 *   2 — same hex, self-healed (was missing from hex-set)
 */
export const ATOMIC_UPDATE_RIDER_LOCATION = `
local riderId    = ARGV[1]
local lat        = ARGV[2]
local lng        = ARGV[3]
local newHexId   = ARGV[4]
local timestamp  = ARGV[5]
local role       = ARGV[6]

local statusKey          = 'rider:' .. riderId .. ':status'
local roleKey            = 'rider:' .. riderId .. ':role'
local hexKey             = 'rider:' .. riderId .. ':hex'
local lastSeenKey        = 'rider:' .. riderId .. ':lastSeen'
local locationKey        = 'rider:' .. riderId .. ':location'
local pendingDeliveryKey = 'rider:' .. riderId .. ':pendingDelivery'
local currentDeliveryKey = 'rider:' .. riderId .. ':currentDelivery'

local status = redis.call('GET', statusKey)

-- Rider app guarantees it only sends location when active;
-- auto-restore if Redis disagrees (key expired, server restart, etc.).
if status ~= 'ONLINE' and status ~= 'ACTIVE' then
  local hasCurrent = redis.call('GET', currentDeliveryKey)
  if hasCurrent then
    status = 'ACTIVE'
  else
    -- Restore to ONLINE
    redis.call('SET', statusKey, 'ONLINE')
    redis.call('SET', roleKey, role)
    redis.call('SET', locationKey, '{"lat":' .. lat .. ',"lng":' .. lng .. '}')
    redis.call('SET', lastSeenKey, timestamp)
    redis.call('SET', hexKey, newHexId)
    local hasPending = redis.call('GET', pendingDeliveryKey)
    if not hasPending then
      redis.call('SADD', 'hex:' .. newHexId .. ':riders', riderId)
    end
    return -1  -- caller must emit online event + update geo-index + active-set
  end
end

redis.call('SET', locationKey, '{"lat":'..lat..',"lng":'..lng..'}')
redis.call('SET', lastSeenKey, timestamp)

local oldHexId = redis.call('GET', hexKey)
redis.call('SET', hexKey, newHexId)

local hasPending = redis.call('GET', pendingDeliveryKey) or redis.call('GET', currentDeliveryKey)

if oldHexId ~= newHexId then
  if oldHexId then
    redis.call('SREM', 'hex:' .. oldHexId .. ':riders', riderId)
  end
  if not hasPending then
    redis.call('SADD', 'hex:' .. newHexId .. ':riders', riderId)
  end
  return 1
end

-- Same hex: self-heal if rider is missing from the set and has no active job
if not hasPending then
  if redis.call('SISMEMBER', 'hex:' .. newHexId .. ':riders', riderId) == 0 then
    redis.call('SADD', 'hex:' .. newHexId .. ':riders', riderId)
    return 2
  end
end

return 0
`;
