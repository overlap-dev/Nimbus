import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Handlebars from 'handlebars';

const templatesDir = join(import.meta.dirname, 'templates');

const compiledByName = new Map<string, Handlebars.TemplateDelegate>();

/**
 * Render a Handlebars template source string with the given context.
 * Output is HTML-escaped by default.
 */
export const renderMailHtml = (
    template: string,
    context: Record<string, unknown>,
): string => {
    const compiled = Handlebars.compile(template, { noEscape: false });
    return compiled(context);
};

/**
 * Load a named `.hbs` template from `templates/` and render it with context.
 * Template name is the file basename without extension (e.g. `"ticket-assigned"`).
 */
export const renderMailHtmlFromTemplate = async (
    templateName: string,
    context: Record<string, unknown>,
): Promise<string> => {
    let compiled = compiledByName.get(templateName);

    if (!compiled) {
        const path = join(templatesDir, `${templateName}.hbs`);
        const source = await readFile(path, 'utf8');
        compiled = Handlebars.compile(source, { noEscape: false });
        compiledByName.set(templateName, compiled);
    }

    return compiled(context);
};
