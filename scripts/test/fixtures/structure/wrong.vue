<!-- The five mistakes in a Vue template. -->
<template>
  <div class="fd-stack">
    <div class="fd-callout" data-tone="warning" role="note">
      <div class="fd-callout-content"><p class="fd-callout-body">Your card expires {{ when }}.</p></div>
    </div>
    <div class="fd-grid">
      <section class="fd-form-section"><div class="fd-form-section-head"><h2 class="fd-form-section-title">Profile</h2></div><div class="fd-form-section-body"><p>Name</p></div></section>
    </div>
    <select class="fd-select" aria-label="Role" v-model="role"><option>Owner</option></select>
    <div class="fd-menu" id="acct-menu" role="menu" hidden><button v-for="i in items" :key="i" class="fd-menu-item" type="button">{{ i }}</button></div>
    <fieldset><legend>Notifications</legend></fieldset>
    <table><tbody><tr><td>Key</td></tr></tbody></table>
    <div class="fd-card"><table class="fd-table" aria-label="Keys"><tbody><tr><td>Key</td></tr></tbody></table></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ when: string; items: string[] }>();
const role = 'Owner';
</script>
