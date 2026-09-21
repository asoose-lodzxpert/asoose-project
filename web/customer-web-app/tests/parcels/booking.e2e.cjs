const { test, expect } = require("@playwright/test");
const { encode } = require("next-auth/jwt");

// Isolated browser fixtures exercise layout without creating real parcels or charging money.
// Run against a local dev server using NEXTAUTH_SECRET=parcel-ui-test-session-secret.
const quote = {
  fare: 1500,
  distanceKm: 12.3,
  estimatedDurationMinutes: 25,
  sizeMultiplier: 1,
};
const addresses = [
  {
    id: "pickup",
    street: "12 Marina Road",
    city: "Lagos",
    state: "Lagos",
    latitude: 6.4541,
    longitude: 3.3947,
  },
  {
    id: "dropoff",
    street: "20 Ikeja Road",
    city: "Lagos",
    state: "Lagos",
    latitude: 6.6018,
    longitude: 3.3515,
  },
];
for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`three-step booking fits ${viewport.width}px and preserves contacts`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize(viewport);
    await page.addLocatorHandler(page.getByRole("button", { name: "Choose city later" }), async () => {
      await page.getByRole("button", { name: "Choose city later" }).click();
    });
    const token = await encode({
      secret: "parcel-ui-test-session-secret",
      token: {
        id: "browser-test",
        role: "CUSTOMER",
        accessToken: "test-only-token",
        name: "Chidi Okafor",
      },
    });
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: token,
        url: baseURL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.route("**/api/backend/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data = {};
      if (path.endsWith("/users/me"))
        data = {
          firstName: "Chidi",
          lastName: "Okafor",
          phone: "+2348098765432",
        };
      else if (path.includes("/addresses")) data = addresses;
      else if (path.endsWith("/parcels/estimate")) data = quote;
      else if (path.endsWith("/wallet/me")) data = { balance: 5000 };
      else if (path.includes("/cities")) data = [];
      else if (path.includes("/cart")) data = { items: [] };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data }),
      });
    });
    await page.goto("/main/delivery");
    await expect(
      page.getByRole("heading", { name: "Where is your package going?" }),
    ).toBeVisible({ timeout: 20000 });
    await page.getByLabel("Saved pickup address").selectOption("pickup");
    await page.getByLabel("Saved dropoff address").selectOption("dropoff");
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeEnabled();
    await page.screenshot({
      path: `test-results/parcels/location-${viewport.width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: /Book for someone else/ }).click();
    await page.getByLabel("sender name", { exact: true }).fill("Chidi Okafor");
    await page
      .getByLabel("sender phone", { exact: true })
      .fill("+2348098765432");
    await page.getByLabel("recipient name", { exact: true }).fill("Ada Okafor");
    await page
      .getByLabel("recipient phone", { exact: true })
      .fill("+2348012345678");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("button", { name: "Schedule for later", exact: true })
      .click();
    await page.getByLabel("Pickup date and time").fill("2030-12-01T09:00");
    await expect(
      page.getByRole("button", { name: /Book delivery/ }),
    ).toBeEnabled();
    await expect(page.getByText("Chidi Okafor · +2348098765432")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/parcels/review-${viewport.width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Edit sender", exact: true })
      .click();
    await expect(page.getByLabel("sender name", { exact: true })).toHaveValue(
      "Chidi Okafor",
    );
  });
}
