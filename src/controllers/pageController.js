export const getAbout = (req, res) => {
  res.render('about', { title: 'About' });
};

export const getContact = (req, res) => {
  res.render('contact', { title: 'Contact' });
};