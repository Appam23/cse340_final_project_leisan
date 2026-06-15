// Controller = the brain that handles home page logic

export const getHome = (req, res) => {
  // This function runs when someone visits the home page
  res.render('index', { title: 'Car Dealership' }, (err, html) => {
    if (err) return res.send('<h1>Welcome to Car Dealership</h1>');
    res.send(html);
  });
};
