<template>
  <div>
    <fd-chart type="pie" />
    <fd-icon size="13" />
    <fd-code :code="5" />
    <button @fd:change="(e: number) => e">x</button>
  </div>
</template>
