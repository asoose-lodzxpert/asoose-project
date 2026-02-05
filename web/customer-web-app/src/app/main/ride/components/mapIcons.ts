export const MAP_ICONS = {
  userLocation: {
    url:
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="3"/>
        <circle cx="20" cy="20" r="6" fill="white"/>
      </svg>
    `),
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 },
  },
  pickupPin: {
    url:
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(`
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#10b981"/>
        <circle cx="16" cy="16" r="8" fill="white"/>
        <circle cx="16" cy="16" r="4" fill="#10b981"/>
      </svg>
    `),
    scaledSize: { width: 32, height: 42 },
    anchor: { x: 16, y: 42 },
  },
  destinationPin: {
    url:
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(`
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#ef4444"/>
        <rect x="11" y="11" width="10" height="10" rx="1" fill="white"/>
      </svg>
    `),
    scaledSize: { width: 32, height: 42 },
    anchor: { x: 16, y: 42 },
  },
  carIcon: (heading: number) => ({
    url:
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(`
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(24, 24) rotate(${heading}) translate(-24, -24)">
          <ellipse cx="24" cy="28" rx="16" ry="10" fill="rgba(0,0,0,0.2)"/>
          <path d="M24 8 L32 28 L28 28 L28 32 L20 32 L20 28 L16 28 Z" fill="#000000" stroke="white" stroke-width="1.5"/>
          <circle cx="20" cy="30" r="2" fill="white"/>
          <circle cx="28" cy="30" r="2" fill="white"/>
          <path d="M24 8 L26 14 L22 14 Z" fill="#fbbf24"/>
        </g>
      </svg>
    `),
    scaledSize: { width: 48, height: 48 },
    anchor: { x: 24, y: 24 },
  }),
};
