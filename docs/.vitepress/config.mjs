import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
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
            { text: "Guide", link: "/guide/quickstart" },
        ],

        sidebar: {
            guide: [
                {
                    text: "What is Nimbus?",
                    link: "/guide/what-is-nimbus",
                },
                {
                    text: "Quickstart",
                    link: "/guide/quickstart",
                },
                {
                    text: "Observability",
                    link: "/guide/observability",
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
                            text: "Logging",
                            link: "/guide/core/logging",
                        },
                        {
                            text: "Exceptions",
                            link: "/guide/core/exceptions",
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
                'Released under the <a href="https://github.com/overlap-dev/Nimbus/blob/main/LICENSE">MIT License</a>.',
            copyright:
                'Copyright © 2024-present <a href="https://overlap.at">Overlap GmbH & Co KG</a>',
        },
    },
});
