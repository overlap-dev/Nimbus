import { defineConfig } from "vitepress";
import llmstxt, { copyOrDownloadAsMarkdownButtons } from "vitepress-plugin-llms";
import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
    title: "Nimbus CQRS Framework",
    markdown: {
        image: {
            lazyLoading: true,
        },
        config(md) {
            md.use(copyOrDownloadAsMarkdownButtons);
        },
    },
    vite: {
        plugins: [
            llmstxt({
                domain: "https://nimbus.overlap.at",
                customTemplateVariables: {
                    title: "Nimbus CQRS Framework",
                    description:
                        "TypeScript framework for event-driven apps: CQRS, Event Sourcing, CloudEvents messaging, OpenTelemetry.",
                    details:
                        "Start with /guide/glossary.md and /guide/in-depth-example.md for terminology and a full walkthrough. Package API reference: https://jsr.io/@nimbus-cqrs",
                },
                customLLMsTxtTemplate: `# {title}

{description}

{details}

## Guide

{toc}

## Optional

- [eventsourcing-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/eventsourcing-demo): Full CQRS + Event Sourcing example application
- [JSR @nimbus-cqrs](https://jsr.io/@nimbus-cqrs): Generated API documentation for all packages
- [EventSourcingDB docs](https://docs.eventsourcingdb.io/): Event store used by the EventSourcingDB package
- [CloudEvents](https://cloudevents.io/): Message format used by Commands, Events, and Queries
`,
                excludeIndexPage: true,
            }),
        ],
    },
    description: "Nimbus is an open-source application framework for building event-driven systems using CQRS and Event Sourcing in TypeScript.",
    head: [
        ["link", {
            rel: "icon",
            type: "image/svg+xml",
            href: "/favicon.svg",
        }],
        ["link", {
            rel: "icon",
            type: "image/png",
            sizes: "96x96",
            href: "/favicon-96x96.png",
        }],
        ["link", { rel: "shortcut icon", href: "/favicon.ico" }],
        ["link", {
            rel: "apple-touch-icon",
            sizes: "180x180",
            href: "/apple-touch-icon.png",
        }],
        ["meta", {
            name: "apple-mobile-web-app-title",
            content: "Nimbus",
        }],
        ["link", { rel: "manifest", href: "/site.webmanifest" }],

        ["meta", { property: "og:site_name", content: "Nimbus" }],
        ["meta", { property: "og:title", content: "Nimbus CQRS Framework" }],
        ["meta", {
            property: "og:description",
            content: "Nimbus is an open-source application framework for building event-driven systems using CQRS and Event Sourcing in TypeScript.",
        }],
        ["meta", { property: "og:type", content: "website" }],
        ["meta", { property: "og:image", content: "https://nimbus.overlap.at/nimbus-cqrs-og.png" }],
        ["meta", { property: "og:image:alt", content: "Nimbus logo and tagline" }],
        ["meta", { property: "og:image:type", content: "image/png" }],
        ["meta", { property: "og:image:width", content: "1200" }],
        ["meta", { property: "og:image:height", content: "630" }],

        ["meta", { name: "twitter:card", content: "summary_large_image" }],
        ["meta", { name: "twitter:title", content: "Nimbus CQRS Framework" }],
        ["meta", {
            name: "twitter:description",
            content: "Nimbus is an open-source application framework for building event-driven systems using CQRS and Event Sourcing in TypeScript." }],
        ["meta", { name: "twitter:image", content: "https://nimbus.overlap.at/nimbus-cqrs-og.png" }],
        ["meta", { name: "twitter:image:alt", content: "Nimbus logo and tagline" }],
    ],
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        logo:
            "https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/Nimbus.svg",
        search: {
            provider: "local",
        },

        nav: [
            { text: "Home", link: "/" },
            { text: "Guide", link: "/guide/what-is-nimbus" },
        ],

        sidebar: {
            guide: [
                {
                    text: "What is Nimbus?",
                    link: "/guide/what-is-nimbus",
                },
                {
                    text: "Philosophy",
                    link: "/guide/philosophy",
                },
                {
                    text: "Architecture",
                    link: "/guide/architecture",
                },
                {
                    text: "The Era of AI",
                    link: "/guide/era-of-ai",
                },
                {
                    text: "Quickstart",
                    link: "/guide/quickstart",
                },
                {
                    text: "In Depth Example",
                    link: "/guide/in-depth-example",
                },
                {
                    text: "Glossary",
                    link: "/guide/glossary",
                },
                {
                    text: "Core",
                    link: "/guide/core",
                    items: [
                        {
                            text: "Commands",
                            link: "/guide/core/commands",
                        },
                        {
                            text: "Queries",
                            link: "/guide/core/queries",
                        },
                        {
                            text: "Events",
                            link: "/guide/core/events",
                        },
                        {
                            text: "Router",
                            link: "/guide/core/router",
                        },
                        {
                            text: "Event Bus",
                            link: "/guide/core/event-bus",
                        },
                        {
                            text: "withRetry",
                            link: "/guide/core/with-retry",
                        },
                        {
                            text: "Exceptions",
                            link: "/guide/core/exceptions",
                        },
                        {
                            text: "Observability",
                            link: "/guide/core/observability",
                        },
                        {
                            text: "Logging",
                            link: "/guide/core/logging",
                        },

                    ],
                },

                {
                    text: "Hono",
                    link: "/guide/hono",
                    items: [
                        {
                            text: "CorrelationID Middleware",
                            link: "/guide/hono/correlationid",
                        },
                        {
                            text: "Logger Middleware",
                            link: "/guide/hono/logger",
                        },
                        {
                            text: "onError Handler",
                            link: "/guide/hono/on-error",
                        },
                    ],
                },

                {
                    text: "EventSourcingDB",
                    link: "/guide/eventsourcingdb",
                    items: [
                        {
                            text: "Client Setup",
                            link: "/guide/eventsourcingdb/client-setup",
                        },
                        {
                            text: "Write Events",
                            link: "/guide/eventsourcingdb/write-events",
                        },
                        {
                            text: "Read Events",
                            link: "/guide/eventsourcingdb/read-events",
                        },
                        {
                            text: "Event Observer",
                            link: "/guide/eventsourcingdb/event-observer",
                        },
                        {
                            text: "Event Mapping",
                            link: "/guide/eventsourcingdb/event-mapping",
                        },
                    ],
                },

                {
                    text: "MongoDB",
                    link: "/guide/mongodb",
                    items: [
                        {
                            text: "Connection Manager",
                            link: "/guide/mongodb/connection-manager",
                        },
                        {
                            text: "Repository",
                            link: "/guide/mongodb/repository",
                        },
                        {
                            text: "CRUD+",
                            link: "/guide/mongodb/crud",
                        },
                        {
                            text: "MongoJSON",
                            link: "/guide/mongodb/mongo-json",
                        },
                        {
                            text: "handleMongoError",
                            link: "/guide/mongodb/handle-mongo-error",
                        },
                        {
                            text: "Deploy Collection",
                            link: "/guide/mongodb/deploy-collection",
                        },
                    ],
                },

                {
                    text: "Utils",
                    link: "/guide/utils",
                    items: [
                        {
                            text: "getEnv",
                            link: "/guide/utils/get-env",
                        },
                    ],
                },
            ],

            reference: [
                {
                    text: "Core",
                    items: [
                        {
                            text: "Commands",
                            link: "/reference/commands",
                        },
                    ],
                },
            ],
        },

        socialLinks: [
            {
                icon: "github",
                link: "https://github.com/overlap-dev/Nimbus",
            },
        ],

        footer: {
            message:
                'Released under the <a href="https://github.com/overlap-dev/Nimbus/blob/main/LICENSE">Apache License 2.0</a>.',
            copyright:
                'Copyright © 2024-present <a href="https://overlap.at">Overlap GmbH & Co KG</a>',
        },
    },
}), {
    mermaid: {
        look: "handDrawn",
        theme: "default",
    },
    mermaidPlugin: {
        class: "mermaid",
    },
});
