Templates for the templates-service-mock

Usage
- Templates are AsciiDoc (.adoc) files with simple placeholders in `{curly.braces}`.
- Replace placeholders using a templating layer before rendering. The mock service expects placeholders like `{order.number}`, `{customer.name}`, etc.

Placeholders (common)
- `company.*` - Company metadata (name, email, phone)
- `order.*`, `invoice.*`, `shipment.*`, `refund.*`, `cancellation.*`
- `customer.*` - customer fields
- `items` - replace with repeated rows; templating system should expand `{#items}` ... `{#end}` sections.

Suggested minimal rendering flow
1. Load template file.
2. Replace block placeholders first (e.g. iterate `items`).
3. Replace single value placeholders.
4. Render AsciiDoc to HTML/PDF using Asciidoctor if needed.

Notes
- These templates are intentionally simple and should be adapted to match the data shape returned by your services.
- If you want, I can add a tiny renderer script (Node.js) that performs placeholder substitution and calls `asciidoctor` to produce HTML/PDF.
