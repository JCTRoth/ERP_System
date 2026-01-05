Templates Service

This service serves AsciiDoc templates and provides preview and PDF generation endpoints for development.

Running

Install dependencies and start:

```bash
cd apps/services/nodejs/templates-service
npm ci
npm start
```

PDF generation

To generate real PDFs the service calls the `asciidoctor-pdf` CLI if available. Install it with:

```bash
# system ruby gem
sudo gem install asciidoctor-pdf
```

Alternatively run the service inside a container that has `asciidoctor-pdf` installed.

Endpoints

- `GET /api/templates` - list templates
- `GET /api/templates/:id` - get template
- `POST /api/templates/:id/render` - render HTML preview (accepts JSON context)
- `GET /api/templates/:id/pdf?context=...` - returns PDF or HTML fallback
- `GET /api/templates/context-samples` - returns sample records for preview selection
