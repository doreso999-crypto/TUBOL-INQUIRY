# TUBOL-INQUIRY

Standalone Tampermonkey inquiry scanner for Credit Repair Cloud (CRC).

## Features

- Extracts hard inquiries by bureau
- Creates a unique identifier for each inquiry
- Detects already-disputed inquiries per bureau
- Matches inquiries to OPEN accounts on the same bureau
- Uses creditor aliases and similarity scoring for naming variations
- Separates the launcher from the CRC panel to avoid overlap
- Robust minimize / restore behavior
- Filters recent inquiries
- Groups results by Experian, Equifax, and TransUnion
- Copies inquiry results

## Loading

Use the root `crc-inquiry-scanner.js`. It loads the preserved scanner core with cache busting and applies the UI fixes automatically.

Target: `https://app.creditrepaircloud.com/app/clients/*`
