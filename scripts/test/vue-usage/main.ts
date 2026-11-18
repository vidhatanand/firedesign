import { createApp } from 'vue';
import Fire, { fireVueOptions } from 'fire-design/vue';
import Usage from './Usage.vue';

const app = createApp(Usage);
app.use(Fire);
const options = fireVueOptions({ template: { compilerOptions: { comments: false } } });
const ws: 'preserve' = options.template.compilerOptions.whitespace;
const custom: boolean = options.template.compilerOptions.isCustomElement('fd-chart');
export { app, ws, custom };
