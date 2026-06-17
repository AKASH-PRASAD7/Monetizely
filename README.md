# Monetizely Quoting Tool

A lightweight, Next.js-based quoting application for SaaS pricing analysts to model product catalogs and generate shareable customer quotes.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Server Actions)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS v4 
- **Testing**: Vitest (Unit Math) + Playwright (E2E)

## How to run locally

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   Create a `.env` file in the root and add your Neon Postgres connection string:
   ```env
   DATABASE_URL="postgresql://user:password@ep-cool-db.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

3. **Push the schema to the database**:
   ```bash
   npm run db:push
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Running Tests

**Unit Tests (Pricing Math)**:
The pricing logic is completely isolated in `src/lib/pricing.ts`.
```bash
npm run test
```

**E2E Tests (Playwright)**:
```bash
npx playwright install
npm run test:e2e
```

## Assumptions & Design Decisions

- **Quote Stability vs Live Catalog**: I decided to denormalize the `productName` and `tierName` into the `quotes` table when a quote is created. If someone changes the name of a product or tier later, existing quotes will retain their historical names. The same goes for pricing—the math is run at creation time and the results are frozen in `quote_line_items`.
- **Term Discount Application**: Based on the spec and the sample quote, the term discount (15% annual, 25% two-year) applies *only* to the base per-seat price of the product, not to add-ons. Add-ons are billed exactly as defined.
- **Percentage-of-Product Add-ons**: For these add-ons, the percentage applies to the *discounted* base product cost. This matches the intuition that you pay a percentage of what you actually paid for the product.
- **Global Quote Discount**: The quote-level discount applies to the total subtotal (base product + all add-ons combined), exactly as indicated by "apply a discount to the quote".

## What I would build next with more time

1. **Authentication/Authorization**: Add NextAuth/Clerk so multiple analysts can use the tool securely, with role-based access control.
2. **Draft vs Published Quotes**: Currently, quotes are generated immediately. Adding a "Draft" status would allow analysts to play around with numbers before "locking" the quote and generating the shareable URL.
3. **Multiple Currencies**: Expand the `products` table to have regional pricing configs, and format the quote based on the selected currency.
4. **PDF Export**: Implement server-side generation (e.g., via puppeteer or `react-pdf`) so the read-only shareable view can be easily downloaded.
