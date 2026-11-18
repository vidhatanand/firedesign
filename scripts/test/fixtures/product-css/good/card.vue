<template>
  <article class="acme-vue-card"><slot /></article>
</template>

<style scoped>
.acme-vue-card { padding: var(--fd-space-4); color: var(--acme-ink); }
.acme-vue-card :deep(.fd-badge) { margin-inline-start: var(--fd-space-2); }
</style>
