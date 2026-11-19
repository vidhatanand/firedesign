<!-- The same template written right: no finding. -->
<template>
  <div class="fd-stack">
    <div class="fd-callout" data-tone="warning" role="note">
      <fd-icon class="fd-callout-icon" icon="triangle-alert"></fd-icon>
      <div class="fd-callout-content"><p class="fd-callout-body">Your card expires {{ when }}.</p></div>
    </div>
    <div class="fd-callout" role="note"><slot name="icon" /><div class="fd-callout-content"><p class="fd-callout-body">Saved.</p></div></div>
    <form class="fd-form">
      <section class="fd-form-section"><div class="fd-form-section-head"><h2 class="fd-form-section-title">Profile</h2></div><div class="fd-form-section-body"><p>Name</p></div></section>
    </form>
    <label class="fd-select"><select aria-label="Role" v-model="role"><option>Owner</option></select></label>
    <div class="fd-menu" id="acct-menu" role="menu" popover><button v-for="i in items" :key="i" class="fd-menu-item" type="button">{{ i }}</button></div>
    <div class="fd-field" role="group" aria-labelledby="notify-l"><span class="fd-field-label" id="notify-l">Notifications</span></div>
    <div class="fd-table-wrap"><div class="fd-table-scroll"><table class="fd-table" aria-label="Keys"><tbody><tr><td>Key</td></tr></tbody></table></div></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ when: string; items: string[] }>();
const role = 'Owner';
</script>
