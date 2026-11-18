// fire/js/icons.js has no declaration file; the sprite (app/fire-sprite.tsx) imports it on the server, where fire.js
// itself cannot run. The shape is the one fire.d.ts gives ICONS.
declare module 'fire-design/fire/js/icons.js' {
  export const ICONS: Readonly<Record<import('fire-design').IconName, string>>;
}
