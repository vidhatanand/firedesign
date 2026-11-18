// A page that settles late: its text arrives 600 ms after load (a skeleton swap), then 300 ms later its last change.
window.addEventListener('load', () => {
  setTimeout(() => {
    document.querySelector('.fd-card p').textContent = 'Three services are…';
    setTimeout(() => { document.querySelector('.fd-card p').textContent = 'Three services are healthy.'; }, 300);
  }, 600);
});
