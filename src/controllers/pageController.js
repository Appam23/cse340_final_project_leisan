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
      rating: '',
    },
    fieldErrors: {},
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
  const rating = (req.body.rating || '').trim();
  const fieldErrors = {};

  if (!name) {
    fieldErrors.name = 'Please enter your name.';
  }

  if (!email) {
    fieldErrors.email = 'Please enter your email address.';
  }

  if (!phone) {
    fieldErrors.phone = 'Please enter your phone number.';
  }

  if (!['1', '2', '3', '4', '5'].includes(rating)) {
    fieldErrors.rating = 'Please choose a star rating.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return res.status(400).render('car-review', {
      ...viewModel,
      formData: { name, email, phone, message, rating },
      fieldErrors,
      inquiryError: 'Please correct the highlighted fields before submitting.',
    });
  }

  req.flash('success', `Thanks, ${name}. Your ${rating}-star inquiry about ${viewModel.car.title} was received.`);
  return res.redirect(`/cars/${viewModel.car.id}`);
};