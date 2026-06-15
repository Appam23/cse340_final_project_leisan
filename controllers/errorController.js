// Controller = handles error pages

export const handle404 = (req, res) => {
  // This runs when a page is not found (404)
  res.status(404).render('404', { title: 'Page Not Found' });
};

export const handle500 = (err, req, res, next) => {
  // This runs when there's a server error (500)
  console.error('Server error:', err);
  res.status(500).render('500', { title: 'Server Error' });
};
