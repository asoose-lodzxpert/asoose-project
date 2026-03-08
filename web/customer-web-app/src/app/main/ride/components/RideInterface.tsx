/**
 * @deprecated Use RideController instead. This module re-exports RideController
 * for backward compatibility. RideController handles all ride state transitions
 * including configuring, confirmed, and payment-required stages that this
 * component was missing.
 */
export { RideController as RideInterface } from './RideController';
