---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
    name: "Nimbus"
    text: "Simplify Event-Driven Applications"
    tagline: Build event-driven applications with Typescript.
    image:
        src: https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/Nimbus.svg
        alt: Nimbus

    actions:
        - theme: brand
          text: What is Nimbus?
          link: /guide/what-is-nimbus
        - theme: alt
          text: Quickstart
          link: /guide/quickstart
        - theme: alt
          text: GitHub
          link: https://github.com/overlap-dev/Nimbus
---

<script setup>
import Features from './components/Features.vue'

const features = [
    {
        icon: { src: '/simplecore.png', width: '48px', height: '48px' },
        title: 'Simple Core Concepts',
        details: 'No clunky and complex OOP or FP design principles. No Framework Magic. Just explicit code.<br><br>Compose an application with commands, events, and queries.',
    },
    {
        icon: { src: '/cqrs.png', width: '48px', height: '48px' },
        title: 'Commands & Queries',
        details: 'The real world doesn\'t operate in snapshots – instead it operates in actions, events and outcomes.<br><br>Nimbus is a perfect fit for the CQRS pattern. Read more on <a href="https://cqrs.com/" target="_blank" rel="noopener noreferrer">cqrs.com</a>.',
    },
    {
        icon: { src: '/eventsourcingdb.png', width: '48px', height: '48px' },
        title: 'Event Sourcing',
        details: 'When building your application to reflect real world actions and events it is crucial to store those events properly.<br><br>Nimbus integrates seamlessly with <a href="https://www.thenativeweb.io/products/eventsourcingdb" target="_blank" rel="noopener noreferrer">EventSourcingDB</a>.',
    },
    {
        icon: { src: '/opentelemetry.png', width: '48px', height: '48px' },
        title: 'Observability Built-In',
        details: 'Logging, tracing, and metrics. Batteries included.<br><br>Nimbus uses <a href="https://opentelemetry.io/" target="_blank" rel="noopener noreferrer">OpenTelemetry</a> for all relevant operations to provide a solid foundation for observability out of the box.',
    },
]
</script>

<Features :features="features" />
