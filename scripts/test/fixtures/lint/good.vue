<template>
  <div class="fd-table" :class="{ 'fd-table-wrap': wrap }" data-density="compact">
    <button class="fd-btn" data-icon-only :aria-label="label"><fd-icon icon="x" /></button>
    <span>{{ a < b ? 'x' : "y" }}</span>
  </div>
</template>
<script setup lang="ts">
const label = 'x'; const html = '<i class="fd-nope" style="x">';
</script>
<style>.fd-nope { color: #fff }</style>
