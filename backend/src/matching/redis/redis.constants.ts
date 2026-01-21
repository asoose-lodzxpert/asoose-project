// Use a distinct token for the matching system Redis client to avoid
// colliding with the application's global Redis provider (which uses
// the 'REDIS_CLIENT' token).
export const MATCHING_REDIS_CLIENT = 'MATCHING_REDIS_CLIENT';
