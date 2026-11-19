// The minimal product's behaviour: a toast when the invite is sent.
import { overlays } from 'fire-design';

document.getElementById('invite').addEventListener('submit', (event) => {
  event.preventDefault();
  overlays.toast({ title: 'Invite sent', description: 'Maya can join Ember from the email.', tone: 'success' });
});
