const express = require("express");

const router = express.Router();

const {

    getFavorites,
    addFavorite,
    removeFavorite

} = require("../controllers/favoriteController");

/* ==========================
   GET ALL FAVORITES
========================== */

router.get("/", getFavorites);

/* ==========================
   ADD FAVORITE
========================== */

router.post("/", addFavorite);

/* ==========================
   REMOVE FAVORITE
========================== */

router.delete("/:propertyId", removeFavorite);

module.exports = router;