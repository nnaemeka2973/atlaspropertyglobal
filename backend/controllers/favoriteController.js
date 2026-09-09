const favoriteService = require("../services/favoriteService");

/* ==========================
   GET USER FAVORITES
========================== */

async function getFavorites(req, res) {

    try {

        const { userId } = req.query;

        if (!userId) {

            return res.status(400).json({

                success: false,
                message: "User ID is required."

            });

        }

        const favorites =
            await favoriteService.getFavorites(userId);

        res.json({

            success: true,
            data: favorites

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

}

/* ==========================
   ADD FAVORITE
========================== */

async function addFavorite(req, res) {

    try {

        const {

            userId,
            propertyId,
            propertyData

        } = req.body;

        if (!userId || !propertyId) {

            return res.status(400).json({

                success: false,
                message: "User ID and Property ID are required."

            });

        }

        const favorite =
            await favoriteService.addFavorite(

                userId,
                propertyId,
                propertyData

            );

        res.status(201).json({

            success: true,
            data: favorite

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

}

/* ==========================
   REMOVE FAVORITE
========================== */

async function removeFavorite(req, res) {

    try {

        const { userId } = req.query;

        const { propertyId } = req.params;

        if (!userId) {

            return res.status(400).json({

                success: false,
                message: "User ID is required."

            });

        }


        await favoriteService.removeFavorite(

            userId,
            propertyId

        );

        res.json({

            success: true,
            data: null,
            message: "Favorite removed."

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

}

module.exports = {

    getFavorites,
    addFavorite,
    removeFavorite

};