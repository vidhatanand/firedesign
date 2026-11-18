// The sample screens simulate a first load: skeletons for a moment, then the data (Ember's templates do the same).
// `npm run check` builds with VITE_FIRE_STATIC=1, so the screens stay in the state their markup is written in and
// can be compared with the templates, which are compared without their demo scripts.
export const SIMULATE_LOAD = import.meta.env.VITE_FIRE_STATIC !== '1';
export const LOAD_MS = 600;
