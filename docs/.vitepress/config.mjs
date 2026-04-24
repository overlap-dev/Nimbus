import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
    title: "Nimbus",
    description: "Build event-driven applications with typescript.",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        logo:
            "https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/Nimbus.svg",
        search: {
            provider: "local",
        },
        markdown: {
            image: {
                lazyLoading: true,
            },
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
