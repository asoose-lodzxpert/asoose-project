/**
 * Development-only logger (M4 fix).
 *
 * All console.log calls that contain PII (driver name, phone, vehicle details)
 * or verbose trace output are routed through `devLog` so they are stripped in
 * production builds.  console.error and console.warn are intentionally NOT
 * wrapped — operational errors must be visible in every environment.
 */
export const devLog = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};
