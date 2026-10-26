import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    renderMailHtml,
    renderMailHtmlFromTemplate,
} from './render-mail-html.ts';

test('renderMailHtml interpolates context values', () => {
    const html = renderMailHtml(
        '<p>Hello {{name}}, visit <a href="{{{url}}}">here</a></p>',
        {
            name: 'Ada',
            url: 'https://example.com/tickets/1?tab=a&b=c',
        },
    );

    assert.equal(
        html,
        '<p>Hello Ada, visit <a href="https://example.com/tickets/1?tab=a&b=c">here</a></p>',
    );
});

test('renderMailHtml HTML-escapes interpolated values by default', () => {
    const html = renderMailHtml('<p>Hello {{name}}</p>', {
        name: '<script>alert("xss")</script>',
    });

    assert.equal(
        html,
        '<p>Hello &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>',
    );
});

test('renderMailHtmlFromTemplate loads ticket-assigned.hbs', async () => {
    const ticketUrl = 'http://localhost:5173/tickets/t1?from=mail&x=y';
    const html = await renderMailHtmlFromTemplate('ticket-assigned', {
        name: 'Ada Lovelace',
        title: 'Water damage in room 204',
        ticketUrl,
    });

    assert.match(html, /Hello Ada Lovelace/);
    assert.match(html, /Water damage in room 204/);
    assert.ok(html.includes(`href="${ticketUrl}"`));
    assert.match(html, /Open the Ticket/);
});

test('renderMailHtmlFromTemplate escapes the title', async () => {
    const html = await renderMailHtmlFromTemplate('ticket-assigned', {
        name: 'Ada',
        title: '<b>bold</b>',
        ticketUrl: 'http://localhost:5173/tickets/t1',
    });

    assert.ok(html.includes('&lt;b&gt;bold&lt;/b&gt;'));
});
