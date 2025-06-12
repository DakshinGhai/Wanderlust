const Listing = require("../models/listing");
const axios = require("axios");
const { getDistanceFromLatLonInKm } = require("../utils/distance");

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};
module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "review",
      populate: {
        path: "author",
      },
    })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing });
};

//new create listing for geocoding
module.exports.createListing = async (req, res, next) => {
  try {
    const geoApiKey = process.env.GeoApiKey;
    const locationQuery = req.body.listing.location;

    // Call geocoding API
    const geoApiUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(
      locationQuery
    )}&api_key=${geoApiKey}`;
    const geoResponse = await axios.get(geoApiUrl);

    // Get the first result
    const geoData = geoResponse.data[0];

    if (!geoData) {
      req.flash("error", "Could not fetch geolocation for the given address.");
      return res.redirect("/listings/new");
    }

    const { lat, lon } = geoData;

    // Set up new listing
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    if (req.file) {
      newListing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    // Set geometry field
    newListing.geometry = {
      type: "Point",
      coordinates: [parseFloat(lon), parseFloat(lat)],
    };

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  } catch (err) {
    console.error("Error in createListing:", err.message);
    req.flash("error", "Something went wrong while creating the listing.");
    res.redirect("/listings/new");
  }
};

// old create listing

// module.exports.createListing = async (req, res, next) => {
//   let url = req.file.path;
//   let filename = req.file.filename;
//   const newListing = new Listing(req.body.listing);
//   newListing.owner = req.user._id;
//   newListing.image = { filename, url };
//   await newListing.save();
//   req.flash("success", "New Listing Created!");
//   res.redirect("/listings");
// };
module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    res.redirect("/listings");
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_150,w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const geoApiKey = process.env.GeoApiKey;
    const locationQuery = req.body.listing.location;

    // Call geocoding API
    const geoApiUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(
      locationQuery
    )}&api_key=${geoApiKey}`;
    const geoResponse = await axios.get(geoApiUrl);
    const geoData = geoResponse.data[0];

    if (!geoData) {
      req.flash(
        "error",
        "Could not fetch geolocation for the updated address."
      );
      return res.redirect(`/listings/${id}/edit`);
    }

    const { lat, lon } = geoData;

    // Find and update listing
    let listing = await Listing.findByIdAndUpdate(id, {
      ...req.body.listing,
      geometry: {
        type: "Point",
        coordinates: [parseFloat(lon), parseFloat(lat)],
      },
    });

    // If new image uploaded
    if (typeof req.file !== "undefined") {
      listing.image = {
        filename: req.file.filename,
        url: req.file.path,
      };
      await listing.save();
    }

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error("Error in updateListing:", err.message);
    req.flash("error", "Something went wrong while updating the listing.");
    res.redirect(`/listings/${id}/edit`);
  }
};

// module.exports.updateListing = async (req, res) => {
//   let { id } = req.params;
//   let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
//   if (typeof req.file !== "undefined") {
//     let url = req.file.path;
//     let filename = req.file.filename;
//     listing.image = { filename, url };
//     await listing.save();
//   }
//   req.flash("success", "Listing Updated!");
//   res.redirect(`/listings/${id}`);
// };
module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect(`/listings`);
};
module.exports.searchListings = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.redirect("/listings");

  // Geocode the location
  const geoApiKey = process.env.GeoApiKey;
  const geoUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(
    q
  )}&api_key=${geoApiKey}`;
  const geoRes = await axios.get(geoUrl);

  if (!geoRes.data || geoRes.data.length === 0) {
    req.flash("error", "Location not found.");
    return res.redirect("/listings");
  }

  const lat = parseFloat(geoRes.data[0].lat);
  const lon = parseFloat(geoRes.data[0].lon);

  // Get all listings from DB
  const listings = await Listing.find();

  // Filter listings within 200 km
  const listingsNearby = listings.filter((listing) => {
    if (!listing.geometry) return false;

    const lat2 = listing.geometry.coordinates[1];
    const lon2 = listing.geometry.coordinates[0];
    const distance = getDistanceFromLatLonInKm(lat, lon, lat2, lon2);

    return distance <= 200;
  });

  res.render("listings/index", { allListings: listingsNearby });
};
