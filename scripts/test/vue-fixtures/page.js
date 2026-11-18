// A Vue app that uses fire-design/vue exactly as a product does: the plugin, the v-fire directive, fd- elements in a
// template that Vue compiles in the browser, and @fd:* listeners. The test reads window.result.
import { createApp, ref, nextTick } from 'vue';
import Fire, { fireRouter, isFireElement, fireVueOptions } from '/wrappers/vue/index.js';
import '/fire/elements.js';

const warnings = [];
const handlers = [];
const app = createApp({
  setup() {
    const extra = ref(false);
    const data = ref({ type: 'line', labels: ['a', 'b', 'c'], series: [{ name: 'Runs', values: [3, 5, 4] }, { name: 'Errors', values: [1, 0, 2] }] });
    const changes = ref([]);
    const onChange = (e) => { changes.value.push(e.detail.value); };
    window.vm = { extra, data, changes };
    return { extra, data, changes, onChange };
  },
  template: `
    <main id="host" v-fire>
      <fd-chart id="chart" type="line" :data="data" :height="160" legend @fd:change="onChange"></fd-chart>
      <fd-icon id="icon" icon="search" size="20"></fd-icon>
      <p>text <b>bold</b>
      <i>italic</i></p>
      <section id="inner"><i data-icon="home"></i></section>
      <template v-if="extra"><section id="late"><i data-icon="settings"></i></section></template>
      <span id="changes">{{ changes.join(',') }}</span>
    </main>`,
});
app.config.warnHandler = (msg) => { warnings.push(msg); };
app.use(Fire);

const routes = [];
const router = { afterEach(fn) { routes.push(fn); return () => {}; } };
fireRouter(router);

app.mount('#app');
await nextTick();
window.result = { warnings, routes, isFireElement, fireVueOptions, whitespace: app.config.compilerOptions.whitespace, hasDirective: !!app.directive('fire') };
window.ready = true;
void handlers;
