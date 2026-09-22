import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const templatesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../templates/emails',
);

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderEmailTemplate = async (templateName, variables = {}) => {
  const filePath = path.join(templatesDir, `${templateName}.html`);
  let html = await readFile(filePath, 'utf8');

  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(value));
  }

  return html;
};

export default renderEmailTemplate;
