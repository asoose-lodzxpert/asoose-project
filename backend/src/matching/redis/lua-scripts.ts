/**
 * Lua Scripts for Atomic Redis Operations
 *
 * These scripts ensure race-condition-free state transitions
 * during driver matching and assignment.
 */

/**
 * Atomically try to assign a trip to a driver
 *
 * Returns:
 * - 1: Success (driver locked and removed from hex)
 * - 0: Driver not available (offline, active, or has pending assignment)
 * - -1: Driver already declined this trip
 */
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
  local declinedKey = 'matching:' .. tripType .. ':' .. tripId .. ':declined'
  local lockKey = 'lock:' .. tripType .. ':' .. tripId .. ':driver:' .. driverId
  
  -- Check if driver already declined
  local hasDeclined = redis.call('SISMEMBER', declinedKey, driverId)
  if hasDeclined == 1 then
    return -1
  end
  
  -- Check driver status
  local status = redis.call('GET', statusKey)
  if status ~= 'ONLINE' then
    return 0
  end
  
  -- Check if driver has any pending assignments
  local pendingRide = redis.call('GET', pendingRideKey)
  local pendingDelivery = redis.call('GET', pendingDeliveryKey)
  if pendingRide or pendingDelivery then
    return 0
  end
  
  -- Check if driver has active trips
  local currentRide = redis.call('GET', currentRideKey)
  local currentDelivery = redis.call('GET', currentDeliveryKey)
  if currentRide or currentDelivery then
    return 0
  end
  
  -- All checks passed - perform atomic assignment
  
  -- Set pending assignment
  local pendingKey = tripType == 'ride' and pendingRideKey or pendingDeliveryKey
  redis.call('SETEX', pendingKey, ttl, tripId)
  
  -- Set lock
  redis.call('SETEX', lockKey, ttl, '1')
  
  -- Remove from hex index (no longer available)
  redis.call('SREM', hexDriversKey, driverId)
  redis.call('DECR', 'hex:' .. hexId .. ':count')
  
  return 1
`;

/**
 * Atomically accept a trip assignment
 *
 * Updates driver status to ACTIVE and sets current trip.
 * Clears pending assignment and lock.
 *
 * Returns:
 * - 1: Success
 * - 0: No pending assignment found
 */
export const ATOMIC_ACCEPT_TRIP = `
  local driverId = ARGV[1]
  local tripType = ARGV[2]
  local tripId = ARGV[3]
  
  local statusKey = 'driver:' .. driverId .. ':status'
  local pendingKey = 'driver:' .. driverId .. ':pending' .. (tripType == 'ride' and 'Ride' or 'Delivery')
  local currentKey = 'driver:' .. driverId .. ':current' .. (tripType == 'ride' and 'Ride' or 'Delivery')
  local lockKey = 'lock:' .. tripType .. ':' .. tripId .. ':driver:' .. driverId
  
  -- Verify pending assignment matches
  local pending = redis.call('GET', pendingKey)
  if pending ~= tripId then
    return 0
  end
  
  -- Set driver to ACTIVE
  redis.call('SET', statusKey, 'ACTIVE')
  
  -- Set current trip
  redis.call('SET', currentKey, tripId)
  
  -- Clear pending assignment
  redis.call('DEL', pendingKey)
  
  -- Clear lock
  redis.call('DEL', lockKey)
  
  return 1
`;

/**
 * Atomically decline/timeout a trip assignment
 *
 * Reverts driver back to ONLINE and re-adds to hex index.
 * Adds driver to declined list.
 *
 * Returns:
 * - 1: Success
 * - 0: No pending assignment found
 */
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
  local declinedKey = 'matching:' .. tripType .. ':' .. tripId .. ':declined'
  
  -- Verify pending assignment
  local pending = redis.call('GET', pendingKey)
  if pending ~= tripId then
    return 0
  end
  
  -- Get current status
  local status = redis.call('GET', statusKey)
  
  -- Clear pending assignment and lock
  redis.call('DEL', pendingKey)
  redis.call('DEL', lockKey)
  
  -- Add to declined list
  redis.call('SADD', declinedKey, driverId)
  redis.call('EXPIRE', declinedKey, declinedTtl)
  
  -- If driver is still ONLINE (not manually offline), re-add to hex
  if status == 'ONLINE' then
    redis.call('SADD', hexDriversKey, driverId)
    redis.call('INCR', 'hex:' .. hexId .. ':count')
  end
  
  return 1
`;

/**
 * Atomically complete a trip
 *
 * Clears current trip and sets driver back to ONLINE.
 * Re-adds to hex index if driver is still online.
 *
 * Returns:
 * - 1: Success
 * - 0: No active trip found
 */
export const ATOMIC_COMPLETE_TRIP = `
  local driverId = ARGV[1]
  local tripType = ARGV[2]
  local tripId = ARGV[3]
  local hexId = ARGV[4]
  
  local statusKey = 'driver:' .. driverId .. ':status'
  local currentKey = 'driver:' .. driverId .. ':current' .. (tripType == 'ride' and 'Ride' or 'Delivery')
  local hexDriversKey = 'hex:' .. hexId .. ':drivers'
  
  -- Verify current trip matches
  local current = redis.call('GET', currentKey)
  if current ~= tripId then
    return 0
  end
  
  -- Clear current trip
  redis.call('DEL', currentKey)
  
  -- Set status back to ONLINE
  redis.call('SET', statusKey, 'ONLINE')
  
  -- Re-add to hex index
  redis.call('SADD', hexDriversKey, driverId)
  redis.call('INCR', 'hex:' .. hexId .. ':count')
  
  return 1
`;

/**
 * Atomically update driver location and hex
 *
 * Updates location, hex, and last seen timestamp.
 * Moves driver between hex indexes if hex changed.
 *
 * Returns:
 * - 1: Success, hex changed
 * - 0: Success, same hex
 * - -1: Driver not online
 */
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
  
  -- Check if driver is online
  local status = redis.call('GET', statusKey)
  if status ~= 'ONLINE' and status ~= 'ACTIVE' then
    return -1
  end
  
  -- Update location and last seen
  local location = '{"lat":' .. lat .. ',"lng":' .. lng .. '}'
  redis.call('SET', locationKey, location)
  redis.call('SET', lastSeenKey, timestamp)
  
  -- Get old hex
  local oldHexId = redis.call('GET', hexKey)
  
  -- Update hex
  redis.call('SET', hexKey, newHexId)
  
  -- If hex changed and driver is ONLINE (not ACTIVE or pending)
  if oldHexId ~= newHexId and status == 'ONLINE' then
    local pendingRide = redis.call('GET', pendingRideKey)
    local pendingDelivery = redis.call('GET', pendingDeliveryKey)
    
    -- Only update hex index if no pending assignments
    if not pendingRide and not pendingDelivery then
      -- Remove from old hex
      if oldHexId then
        redis.call('SREM', 'hex:' .. oldHexId .. ':drivers', driverId)
        redis.call('DECR', 'hex:' .. oldHexId .. ':count')
      end
      
      -- Add to new hex
      redis.call('SADD', 'hex:' .. newHexId .. ':drivers', driverId)
      redis.call('INCR', 'hex:' .. newHexId .. ':count')
      
      return 1
    end
  end
  
  return 0
`;

/**
 * Atomically set driver offline
 *
 * Clears all state and removes from all indexes.
 * Only succeeds if driver has no active trips.
 *
 * Returns:
 * - 1: Success
 * - 0: Driver has active trip, cannot go offline
 */
export const ATOMIC_SET_OFFLINE = `
  local driverId = ARGV[1]
  
  local statusKey = 'driver:' .. driverId .. ':status'
  local hexKey = 'driver:' .. driverId .. ':hex'
  local currentRideKey = 'driver:' .. driverId .. ':currentRide'
  local currentDeliveryKey = 'driver:' .. driverId .. ':currentDelivery'
  local pendingRideKey = 'driver:' .. driverId .. ':pendingRide'
  local pendingDeliveryKey = 'driver:' .. driverId .. ':pendingDelivery'
  
  -- Check for active trips
  local currentRide = redis.call('GET', currentRideKey)
  local currentDelivery = redis.call('GET', currentDeliveryKey)
  
  if currentRide or currentDelivery then
    return 0
  end
  
  -- Get hex before clearing
  local hexId = redis.call('GET', hexKey)
  
  -- Clear all pending assignments
  redis.call('DEL', pendingRideKey)
  redis.call('DEL', pendingDeliveryKey)
  
  -- Remove from hex index
  if hexId then
    redis.call('SREM', 'hex:' .. hexId .. ':drivers', driverId)
    redis.call('DECR', 'hex:' .. hexId .. ':count')
  end
  
  -- Set status to OFFLINE
  redis.call('SET', statusKey, 'OFFLINE')
  
  return 1
`;

/**
 * Atomically set driver online
 *
 * Sets driver to ONLINE and adds to hex index.
 *
 * Returns: 1 (always succeeds)
 */
export const ATOMIC_SET_ONLINE = `
  local driverId = ARGV[1]
  local hexId = ARGV[2]
  
  local statusKey = 'driver:' .. driverId .. ':status'
  local hexKey = 'driver:' .. driverId .. ':hex'
  local hexDriversKey = 'hex:' .. hexId .. ':drivers'
  
  -- Set status to ONLINE
  redis.call('SET', statusKey, 'ONLINE')
  
  -- Set hex
  redis.call('SET', hexKey, hexId)
  
  -- Add to hex index
  redis.call('SADD', hexDriversKey, driverId)
  redis.call('INCR', 'hex:' .. hexId .. ':count')
  
  return 1
`;
