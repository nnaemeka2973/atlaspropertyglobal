const supabase = require("../config/supabase");

function logSupabaseFallback(message, error) {
    console.warn(`[favorites] ${message}`, error && error.message ? error.message : error);
}

/* ==========================
   GET USER FAVORITES
========================== */

async function getFavorites(userId) {

    if (!userId) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from("favorites")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            logSupabaseFallback("Supabase favorites query failed.", error);
            return [];
        }

        return Array.isArray(data) ? data : [];
    } catch (error) {
        logSupabaseFallback("Supabase favorites unavailable.", error);
        return [];
    }

}

/* ==========================
   SAVE FAVORITE
========================== */

async function addFavorite(userId, propertyId, propertyData) {

    if (!userId || !propertyId) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from("favorites")
            .insert({
                user_id: userId,
                property_id: propertyId,
                property_data: propertyData
            })
            .select()
            .single();

        if (error) {
            logSupabaseFallback("Supabase add favorite failed.", error);
            return {
                user_id: userId,
                property_id: propertyId,
                property_data: propertyData,
                locally_saved: true
            };
        }

        return data;
    } catch (error) {
        logSupabaseFallback("Supabase add favorite unavailable.", error);
        return {
            user_id: userId,
            property_id: propertyId,
            property_data: propertyData,
            locally_saved: true
        };
    }

}

/* ==========================
   REMOVE FAVORITE
========================== */

async function removeFavorite(userId, propertyId) {

    if (!userId || !propertyId) {
        return false;
    }

    try {
        const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", userId)
            .eq("property_id", propertyId);

        if (error) {
            logSupabaseFallback("Supabase remove favorite failed.", error);
            return false;
        }

        return true;
    } catch (error) {
        logSupabaseFallback("Supabase remove favorite unavailable.", error);
        return false;
    }

}

module.exports = {

    getFavorites,
    addFavorite,
    removeFavorite

};