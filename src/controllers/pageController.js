import { createContactMessage } from '../models/contactModel.js';
import { getVehicleById } from '../models/inventoryModel.js';
import {
  buildVehicleSpecs,
  needsApiImage,
  PLACEHOLDER_IMAGE,
} from '../services/vehiclePresentationService.js';
import { getVehicleImageFromApi } from '../services/vehicleImageService.js';
import { createServiceRequest, getServiceRequestsByUserAndVehicle } from '../models/serviceRequestModel.js';
import {
  createReview,
  deleteReviewByIdForUser,
  getReviewById,
  getReviewsByVehicleId,
  updateReviewByIdForUser,
} from '../models/reviewModel.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SERVICE_TYPE_LABELS = {
  oil_change: 'Oil Change',
  inspection: 'Inspection',
  tire_rotation: 'Tire Rotation',
  brake_service: 'Brake Service',
  other: 'Other',
};

const formatServiceTypeLabel = (value) => {
  if (!value) {
    return 'Service Request';
  }

  return SERVICE_TYPE_LABELS[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
};

export const getAbout = (req, res) => {
  res.render('about', { title: 'About' });
};

const buildContactViewModel = (overrides = {}) => ({
  title: 'Contact',
  formData: {
    name: '',
    email: '',
    subject: '',
    message: '',
  },
  fieldErrors: {},
  contactError: '',
  contactSuccess: '',
  ...overrides,
});

export const getContact = (req, res) => {
  res.render('contact', buildContactViewModel());
};

export const postContact = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const subject = (req.body.subject || '').trim();
    const message = (req.body.message || '').trim();
    const fieldErrors = {};

    if (!name) {
      fieldErrors.name = 'Please enter your name.';
    }

    if (!email) {
      fieldErrors.email = 'Please enter your email address.';
    } else if (!EMAIL_PATTERN.test(email)) {
      fieldErrors.email = 'Please enter a valid email address.';
    }

    if (!subject) {
      fieldErrors.subject = 'Please enter a subject.';
    }

    if (!message) {
      fieldErrors.message = 'Please enter your message.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).render('contact', buildContactViewModel({
        formData: { name, email, subject, message },
        fieldErrors,
        contactError: 'Please fix the highlighted fields before submitting.',
      }));
    }

    const savedMessage = await createContactMessage({
      name,
      email,
      subject,
      message,
    });

    if (!savedMessage) {
      return res.status(500).render('contact', buildContactViewModel({
        formData: { name, email, subject, message },
        contactError: 'We could not save your message. Please try again.',
      }));
    }

    return res.render('contact', buildContactViewModel({
      contactSuccess: 'Thanks for contacting us. We received your message.',
    }));
  } catch (error) {
    next(error);
  }
};

export const getLogin = (req, res) => {
  res.render('login', { title: 'Login' });
};

const findShowcaseCar = (req, carId) => {
  const cars = Array.isArray(req.session?.carShowcase) ? req.session.carShowcase : [];

  return cars.find((car) => car.id === carId);
};

const formatVehiclePrice = (price) => {
  if (price == null) {
    return 'Contact for price';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
};

const buildInquiryViewModel = async (req, carId, overrides = {}) => {
  let car = findShowcaseCar(req, carId);

  if (!car) {
    const vehicle = await getVehicleById(carId);

    if (!vehicle) {
      return null;
    }

    const resolvedImage = needsApiImage(vehicle.image_url)
      ? await getVehicleImageFromApi(vehicle) || vehicle.image_url || PLACEHOLDER_IMAGE
      : vehicle.image_url || PLACEHOLDER_IMAGE;

    car = {
      id: vehicle.id,
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      src: resolvedImage,
      image_url: resolvedImage,
      attribution: 'Inventory listing',
      price: formatVehiclePrice(vehicle.price),
      specs: buildVehicleSpecs(vehicle),
    };
  }

  if (!car) {
    return null;
  }

  const reviews = await getReviewsByVehicleId(car.id);
  const currentUserId = Number(req.session?.user?.id || 0);
  const serviceRequests = currentUserId > 0
    ? await getServiceRequestsByUserAndVehicle({ userId: currentUserId, vehicleId: car.id })
    : [];

  return {
    title: `${car.title} | Car Franchise`,
    mainClass: 'detail-page',
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
    reviewForm: {
      rating: '',
      comment: '',
      editingReviewId: null,
    },
    reviewFieldErrors: {},
    reviewError: null,
    serviceForm: {
      serviceType: '',
      notes: '',
    },
    serviceFieldErrors: {},
    serviceError: null,
    serviceRequests: serviceRequests.map((request) => ({
      ...request,
      displayServiceType: formatServiceTypeLabel(request.service_type),
      displayNotes: request.notes,
    })),
    reviews: reviews.map((review) => ({
      ...review,
      isOwner: currentUserId > 0 && Number(review.user_id) === currentUserId,
    })),
    ...overrides,
  };
};

export const getCarReview = async (req, res, next) => {
  try {
    const viewModel = await buildInquiryViewModel(req, req.params.carId);

    if (!viewModel) {
      req.flash('error', 'That car listing is no longer available. Please choose another car.');
      return res.redirect('/');
    }

    return res.render('car-review', viewModel);
  } catch (error) {
    return next(error);
  }
};

export const postCarInquiry = async (req, res, next) => {
  try {
    const viewModel = await buildInquiryViewModel(req, req.params.carId);

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

    await createContactMessage({
      name,
      email,
      phone,
      subject: `Vehicle Inquiry: ${viewModel.car.title}`,
      message: message || 'No additional message provided.',
      rating: Number(rating),
    });

    const userId = Number(req.session?.user?.id || 0);
    if (userId > 0) {
      await createReview({
        userId,
        vehicleId: viewModel.car.id,
        rating: Number(rating),
        comment: message || `Inquiry submitted by ${name}.`,
      });
    }

    req.flash('success', `Thanks, ${name}. Your ${rating}-star inquiry about ${viewModel.car.title} was received.`);
    return res.redirect(`/cars/${viewModel.car.id}`);
  } catch (error) {
    return next(error);
  }
};

const validateReviewInput = ({ rating, comment }) => {
  const reviewFieldErrors = {};

  if (!['1', '2', '3', '4', '5'].includes(rating)) {
    reviewFieldErrors.rating = 'Please choose a star rating.';
  }

  if (!comment) {
    reviewFieldErrors.comment = 'Please write a review comment.';
  }

  return reviewFieldErrors;
};

export const postCreateReview = async (req, res, next) => {
  try {
    const viewModel = await buildInquiryViewModel(req, req.params.carId);

    if (!viewModel) {
      req.flash('error', 'That car listing is no longer available. Please choose another car.');
      return res.redirect('/');
    }

    const userId = Number(req.session?.user?.id || 0);
    const rating = (req.body.rating || '').trim();
    const comment = (req.body.comment || '').trim();
    const reviewFieldErrors = validateReviewInput({ rating, comment });

    if (Object.keys(reviewFieldErrors).length > 0) {
      return res.status(400).render('car-review', {
        ...viewModel,
        reviewForm: {
          rating,
          comment,
          editingReviewId: null,
        },
        reviewFieldErrors,
        reviewError: 'Please fix the highlighted review fields before submitting.',
      });
    }

    const savedReview = await createReview({
      userId,
      vehicleId: viewModel.car.id,
      rating: Number(rating),
      comment,
    });

    req.flash('success', savedReview?.wasUpdated ? 'Your review has been updated.' : 'Your review has been posted.');
    return res.redirect(`/cars/${viewModel.car.id}`);
  } catch (error) {
    return next(error);
  }
};

export const postEditReview = async (req, res, next) => {
  try {
    const viewModel = await buildInquiryViewModel(req, req.params.carId);

    if (!viewModel) {
      req.flash('error', 'That car listing is no longer available. Please choose another car.');
      return res.redirect('/');
    }

    const userId = Number(req.session?.user?.id || 0);
    const reviewId = Number(req.params.reviewId);
    const rating = (req.body.rating || '').trim();
    const comment = (req.body.comment || '').trim();
    const review = await getReviewById(reviewId);

    if (!review || Number(review.user_id) !== userId || Number(review.vehicle_id) !== Number(viewModel.car.id)) {
      req.flash('error', 'You can only edit your own reviews.');
      return res.redirect(`/cars/${viewModel.car.id}`);
    }

    const reviewFieldErrors = validateReviewInput({ rating, comment });
    if (Object.keys(reviewFieldErrors).length > 0) {
      return res.status(400).render('car-review', {
        ...viewModel,
        reviewForm: {
          rating,
          comment,
          editingReviewId: reviewId,
        },
        reviewFieldErrors,
        reviewError: 'Please fix the highlighted review fields before saving.',
      });
    }

    const updatedReview = await updateReviewByIdForUser({
      reviewId,
      userId,
      rating: Number(rating),
      comment,
    });

    if (!updatedReview) {
      req.flash('error', 'You can only edit your own reviews.');
      return res.redirect(`/cars/${viewModel.car.id}`);
    }

    req.flash('success', 'Your review has been updated.');
    return res.redirect(`/cars/${viewModel.car.id}`);
  } catch (error) {
    return next(error);
  }
};

export const postDeleteReview = async (req, res, next) => {
  try {
    const viewModel = await buildInquiryViewModel(req, req.params.carId);

    if (!viewModel) {
      req.flash('error', 'That car listing is no longer available. Please choose another car.');
      return res.redirect('/');
    }

    const userId = Number(req.session?.user?.id || 0);
    const reviewId = Number(req.params.reviewId);
    const deletedReview = await deleteReviewByIdForUser({ reviewId, userId });

    if (!deletedReview) {
      req.flash('error', 'You can only delete your own reviews.');
      return res.redirect(`/cars/${viewModel.car.id}`);
    }

    req.flash('success', 'Your review has been deleted.');
    return res.redirect(`/cars/${viewModel.car.id}`);
  } catch (error) {
    return next(error);
  }
};

export const postServiceRequest = async (req, res, next) => {
  try {
    const viewModel = await buildInquiryViewModel(req, req.params.carId);

    if (!viewModel) {
      req.flash('error', 'That car listing is no longer available. Please choose another car.');
      return res.redirect('/');
    }

    const userId = Number(req.session?.user?.id || 0);
    const serviceType = (req.body.serviceType || '').trim();
    const notes = (req.body.notes || '').trim();
    const serviceFieldErrors = {};

    if (!serviceType) {
      serviceFieldErrors.serviceType = 'Please choose a service type.';
    } else if (!Object.prototype.hasOwnProperty.call(SERVICE_TYPE_LABELS, serviceType)) {
      serviceFieldErrors.serviceType = 'Please choose a valid service type.';
    }

    if (Object.keys(serviceFieldErrors).length > 0) {
      return res.status(400).render('car-review', {
        ...viewModel,
        serviceForm: {
          serviceType,
          notes,
        },
        serviceFieldErrors,
        serviceError: 'Please fix the highlighted service request fields before submitting.',
      });
    }

    await createServiceRequest({
      userId,
      vehicleId: viewModel.car.id,
      serviceType: SERVICE_TYPE_LABELS[serviceType],
      notes,
    });

    req.flash('success', `Your service request for ${viewModel.car.title} was submitted.`);
    return res.redirect(`/cars/${viewModel.car.id}`);
  } catch (error) {
    return next(error);
  }
};