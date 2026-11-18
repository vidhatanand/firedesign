<script setup lang="ts">
import { ref } from 'vue';
import type { FireEventMap } from 'fire-design';
import 'fire-design/elements';

const data = ref({ type: 'line' as const, labels: ['a', 'b'], series: [{ name: 'x', values: [1, 2] }] });
function onChange(e: FireEventMap['fd:change']) { return e.detail.value; }
function onSelect(e: CustomEvent) { return e.detail; }
</script>

<template>
  <main v-fire>
    <fd-chart type="line" :data="data" :height="240" legend @fd:change="onChange" @fd:select="(e) => e.detail.index" />
    <fd-chart type="sparkline" :data="[1, 2, 3]" variant="bars" y-format="percent" />
    <fd-icon icon="search" size="20" class="fd-muted" />
    <fd-code code="npm i" language="bash" copy :lines="true" />
    <fd-texture pattern="orbit" tone="accent" animated="true" />
    <button class="fd-btn" type="button" @fd:select="onSelect" @fd:copy="(e) => e.detail.value">Go</button>
  </main>
</template>
