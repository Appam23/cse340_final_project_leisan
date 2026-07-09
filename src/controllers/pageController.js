export const getAbout = (req, res) => {
  res.render('about', { title: 'About' });
};

export const getContact = (req, res) => {
  res.render('contact', { title: 'Contact' });
};

export const getLogin = (req, res) => {
  res.render('login', { title: 'Login' });
};

const findShowcaseCar = (req, carId) => {
  const cars = Array.isArray(req.session?.carShowcase) ? req.session.carShowcase : [];

  return cars.find((car) => car.id === carId);
};

const buildInquiryViewModel = (req, res, carId) => {
  const car = findShowcaseCar(req, carId);

  if (!car) {
    return null;
  }

  return {
    title: `${car.title} | Car Franchise`,
    car,
    formData: {
      name: '',
      email: '',
      phone: '',
      message: '',
    },
    inquirySuccess: null,
    inquiryError: null,
  };
};

export const getCarReview = (req, res) => {
  const viewModel = buildInquiryViewModel(req, res, req.params.carId);

  if (!viewModel) {
    req.flash('error', 'That car listing is no longer available. Please choose another car.');
    return res.redirect('/');
  }

  return res.render('car-review', viewModel);
};

export const postCarInquiry = (req, res) => {
  const viewModel = buildInquiryViewModel(req, res, req.params.carId);

  if (!viewModel) {
    req.flash('error', 'That car listing is no longer available. Please choose another car.');
    return res.redirect('/');
  }

  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const phone = (req.body.phone || '').trim();
  const message = (req.body.message || '').trim();

  if (!name || !email || !phone) {
    return res.status(400).render('car-review', {
      ...viewModel,
      formData: { name, email, phone, message },
      inquiryError: 'Please add your name, email, and phone number before submitting.',
    });
  }

  req.flash('success', `Thanks, ${name}. Your inquiry about ${viewModel.car.title} was received.`);
  return res.redirect(`/cars/${viewModel.car.id}`);
};