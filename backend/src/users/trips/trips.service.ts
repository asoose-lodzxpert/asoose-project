import { Injectable } from '@nestjs/common';
import { RidesService } from './rides.service';
import { DeliveriesService } from './deliveries.service';
import {
  RequestRideDto,
  RequestDeliveryDto,
  CancelTripDto,
  RideEstimateDto,
} from './dto/trip.dto';

@Injectable()
export class TripsService {
  constructor(
    private readonly ridesService: RidesService,
    private readonly deliveriesService: DeliveriesService,
  ) {}

  // ========================================
  // RIDE DELEGATION
  // ========================================

  async getRideEstimate(dto: RideEstimateDto) {
    return this.ridesService.getEstimate(dto);
  }

async requestRide(userId: string, dto: RequestRideDto, idempotencyKey: string) {
    // Pass it down to the ridesService
    return this.ridesService.requestRide(userId, dto, idempotencyKey);
  }
  // FIX: Added method required by TripsController
  async confirmRide(userId: string, rideId: string, paymentMethod: string) {
    return this.ridesService.confirmRide(userId, rideId, paymentMethod);
  }

  async getCurrentRide(userId: string) {
    return this.ridesService.getCurrentRide(userId);
  }

  async getDriverLocation(userId: string, rideId: string) {
    return this.ridesService.getDriverLocation(userId, rideId);
  }

  async startRideMatching(rideId: string) {
    return this.ridesService.startRideMatching(rideId);
  }

  async acceptRide(rideId: string, riderId: string) {
    return this.ridesService.acceptRide(rideId, riderId);
  }

  async startRide(rideId: string, riderId: string, otp: string) {
    return this.ridesService.startRide(rideId, riderId, otp);
  }

  async completeRide(
    rideId: string,
    riderId: string,
    lat: number,
    lng: number,
  ) {
    return this.ridesService.completeRide(rideId, riderId, lat, lng);
  }

  async cancelRide(userId: string, rideId: string, dto: CancelTripDto) {
    return this.ridesService.cancelRide(userId, rideId, dto);
  }

  async getUserRides(userId: string, status?: string, page = 1, limit = 20) {
    return this.ridesService.getUserRides(userId, status, page, limit);
  }

  async getRideById(userId: string, rideId: string) {
    return this.ridesService.getRideById(userId, rideId);
  }

  // ========================================
  // DELIVERY DELEGATION
  // ========================================

  // FIX: Updated to accept and pass idempotencyKey
  async requestDelivery(
    userId: string,
    dto: RequestDeliveryDto,
    idempotencyKey?: string,
  ) {
    return this.deliveriesService.requestDelivery(userId, dto);
  }

  async startDeliveryMatching(deliveryId: string) {
    return this.deliveriesService.startDeliveryMatching(deliveryId);
  }

  async assignDriver(deliveryId: string, riderId: string) {
    return this.deliveriesService.assignDriver(deliveryId, riderId);
  }

  async acceptDelivery(deliveryId: string, riderId: string) {
    return this.deliveriesService.acceptDelivery(deliveryId, riderId);
  }

  async confirmPickup(deliveryId: string, riderId: string, proof: string) {
    return this.deliveriesService.confirmPickup(deliveryId, riderId);
  }

  async completeDelivery(
    deliveryId: string,
    riderId: string,
    otp: string,
    proof: string,
    lat: number,
    lng: number,
  ) {
    return this.deliveriesService.completeDelivery(
      deliveryId,
      riderId,
      otp,
      proof,
      lat,
      lng,
    );
  }

  async cancelDelivery(userId: string, deliveryId: string, dto: CancelTripDto) {
    return this.deliveriesService.cancelDelivery(userId, deliveryId, dto);
  }

  async getUserDeliveries(
    userId: string,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    return this.deliveriesService.getUserDeliveries(
      userId,
      status,
      page,
      limit,
    );
  }

  async getDeliveryById(userId: string, deliveryId: string) {
    return this.deliveriesService.getDeliveryById(userId, deliveryId);
  }

  async driverArrived(rideId: string, riderId: string) {
    return this.ridesService.driverArrived(rideId, riderId);
  }
}