// /js/navActive.js
(function () {
  const current = location.pathname.split('/').pop() || 'index.html'

  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = (a.getAttribute('href') || '').split('/').pop()
    if (href === current) a.classList.add('active')
  })
})()
