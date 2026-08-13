export const PACKAGE_TYPES = [
  {
    id: 'SMALL',
    label: 'Small',
    weightLabel: 'Easy to carry',
    weightValue: 2.5,
    description: 'Documents, food packs and small boxes'
  },
  {
    id: 'MEDIUM',
    label: 'Medium',
    weightLabel: 'One-person lift',
    weightValue: 12.5,
    description: 'Electronics, cartons and medium boxes'
  },
  {
    id: 'LARGE',
    label: 'Large',
    weightLabel: 'Bulky item',
    weightValue: 35,
    description: 'Appliances, large cartons and bulky items'
  }
] as const;
