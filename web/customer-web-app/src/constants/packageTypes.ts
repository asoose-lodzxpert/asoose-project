export const PACKAGE_TYPES = [
  { 
    id: 'Document', 
    label: 'Documents', 
    weightLabel: '< 5 kg', 
    weightValue: 2.5,
    description: 'Letters, files, small envelopes' 
  },
  { 
    id: 'Parcel', // Aligned with DeliveryPage logic
    label: 'Small Box', 
    weightLabel: '5-20 kg', 
    weightValue: 12.5,
    description: 'Shoeboxes, small electronics'
  },
  { 
    id: 'Bulk',   // Aligned with DeliveryPage logic
    label: 'Large Item', 
    weightLabel: '20-50 kg', 
    weightValue: 35,
    description: 'Appliances, multiple boxes' 
  },
  { 
    id: 'Heavy',  // Aligned with DeliveryPage logic
    label: 'Heavy Cargo', 
    weightLabel: '50+ kg', 
    weightValue: 60,
    description: 'Furniture, machinery'
  }
] as const;