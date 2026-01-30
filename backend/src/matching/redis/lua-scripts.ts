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
if redis.call('GET', hexCountKey) then
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

local statusKey = 'driver:' .. driverId .. ':status'
local hexKey = 'driver:' .. driverId .. ':hex'
local lastSeenKey = 'driver:' .. driverId .. ':lastSeen'
local locationKey = 'driver:' .. driverId .. ':location'
local pendingRideKey = 'driver:' .. driverId .. ':pendingRide'
local pendingDeliveryKey = 'driver:' .. driverId .. ':pendingDelivery'

local status = redis.call('GET', statusKey)
if status ~= 'ONLINE' and status ~= 'ACTIVE' then
  return -1
end

redis.call('SET', locationKey, '{"lat":'..lat..',"lng":'..lng..'}')
redis.call('SET', lastSeenKey, timestamp)

local oldHexId = redis.call('GET', hexKey)
redis.call('SET', hexKey, newHexId)

if status ~= 'ONLINE' then
  return 0
end

if redis.call('GET', pendingRideKey) or redis.call('GET', pendingDeliveryKey) then
  return 0
end

if oldHexId ~= newHexId then
  if oldHexId then
    redis.call('SREM', 'hex:' .. oldHexId .. ':drivers', driverId)
    redis.call('DECR', 'hex:' .. oldHexId .. ':count')
  end

  redis.call('SADD', 'hex:' .. newHexId .. ':drivers', driverId)
  redis.call('INCR', 'hex:' .. newHexId .. ':count')
  return 1
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
  redis.call('DECR', 'hex:' .. hexId .. ':count')
end

redis.call('DEL',
  'driver:' .. driverId .. ':pendingRide',
  'driver:' .. driverId .. ':pendingDelivery'
)

redis.call('SET', statusKey, 'OFFLINE')
return 1
`;

export const ATOMIC_SET_ONLINE = `
local driverId = ARGV[1]
local hexId = ARGV[2]

local statusKey = 'driver:' .. driverId .. ':status'
local hexKey = 'driver:' .. driverId .. ':hex'
local hexDriversKey = 'hex:' .. hexId .. ':drivers'
local hexCountKey = 'hex:' .. hexId .. ':count'

redis.call('SET', statusKey, 'ONLINE')
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
