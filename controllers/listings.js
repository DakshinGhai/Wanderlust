const Listing = require("../models/listing");
const axios = require("axios");
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
    const geoApiKey = "683d891911dac606823430kmuc97b03";
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
  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { filename, url };
    await listing.save();
  }
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};
module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect(`/listings`);
};
