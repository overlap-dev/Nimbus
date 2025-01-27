import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Nimbus",
    description: "A Framework to build event-driven applications in the cloud.",
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
                    text: "Project Structure",
                    link: "/guide/project-structure",
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
                            text: "Logging",
                            link: "/guide/core/logging",
                        },
                    ],
                },

                {
                    text: "Oak (HTTP)",
                    link: "/guide/oak",
                    items: [
                        {
                            text: "Router",
                            link: "/guide/oak/router",
                        },
                        {
                            text: "Middleware",
                            link: "/guide/oak/middleware",
                        },
                    ],
                },

                {
                    text: "MongoDB",
                    link: "/guide/mongodb",
                    items: [
                        {
                            text: "Repository",
                            link: "/guide/mongodb/repository",
                        },
                        {
                            text: "CRUD+",
                            link: "/guide/mongodb/crud",
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
