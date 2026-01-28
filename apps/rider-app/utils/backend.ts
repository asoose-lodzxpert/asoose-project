// function mapRideToJob(ride: Ride): IncomingJobOffer {
//   return {
//     id: ride.id,
//     jobType: "ride",
//     pickupAddress: ride.pickupAddress,
//     dropoffAddress: ride.dropoffAddress,
//     customerName: ride.customer.fullName,
//     earnings: ride.totalFare ?? 0,
//     distanceKm: ride.distanceKm ?? undefined,
//     durationMin: ride.durationMin ?? undefined,
//   };
// }

// function mapDeliveryToJob(delivery: Delivery): IncomingJobOffer {
//   return {
//     id: delivery.id,
//     jobType: "delivery",
//     pickupAddress: delivery.pickupAddress,
//     dropoffAddress: delivery.dropoffAddress,
//     customerName: delivery.recipientName,
//     earnings: delivery.deliveryFee,
//     packageDetails: delivery.packageDetails ?? undefined,
//   };
// }
