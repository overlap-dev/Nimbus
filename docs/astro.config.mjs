// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkGfm from 'remark-gfm';
import { starlightBasePath } from "starlight-base-path";

// https://astro.build/config
export default defineConfig({
	base: "/EventFabric",
	integrations: [
		starlight({
			title: 'EventFabric CQRS Framework',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/devn-ch/EventFabric' }],
			sidebar: [
				{
					label: 'Guides',
					items: [
						{ label: 'What is EventFabric?', slug: 'guides/what-is-eventfabric' },
						{ label: 'Philosophy', slug: 'guides/philosophy' },
						{ label: 'Get Started', slug: 'guides/get-started' },
						{ label: 'Architecture', slug: 'guides/architecture' },
						{ label: 'The Era of AI', slug: 'guides/era-of-ai' },
						{ label: 'In Depth Example', slug: 'guides/in-depth-example' },
						{ label: 'Glossary', slug: 'guides/glossary' },
					],
				},
				{
					label: 'Core',
					items: [{ autogenerate: { directory: 'core' } }],
				},
				{
					label: 'Hono',
					items: [{ autogenerate: { directory: 'hono' } }],
				},
				{
					label: 'EventSourcingDB',
					items: [{ autogenerate: { directory: 'eventsourcingdb' } }],
				},
				{
					label: 'MongoDB',
					items: [{ autogenerate: { directory: 'mongodb' } }],
				},
				{
					label: 'Utils',
					items: [{ autogenerate: { directory: 'utils' } }],
				},
			],
			plugins: [starlightBasePath()],
		}),
	],
	markdown: {
    	remarkPlugins: [remarkGfm], // Fügt Unterstützung für Tabellen hinzu
  	},
});
