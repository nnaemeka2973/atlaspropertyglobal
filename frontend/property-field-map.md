# Property Field Map

This document describes the sample property JSON structure from `frontend/debug-prop.json` and maps fields to UI usage, display, fallbacks, and internal use.

## Source sample fields

- `__typename`
- `property_id`
- `listing_id`
- `plan_id`
- `status`
- `photo_count`
- `branding[]`
  - `branding[].__typename`
  - `branding[].photo`
  - `branding[].name`
  - `branding[].phone`
  - `branding[].link`
- `location`
  - `location.__typename`
  - `location.address`
    - `location.address.__typename`
    - `location.address.city`
    - `location.address.line`
    - `location.address.street_name`
    - `location.address.street_number`
    - `location.address.street_suffix`
    - `location.address.country`
    - `location.address.postal_code`
    - `location.address.state_code`
    - `location.address.state`
    - `location.address.coordinate`
      - `location.address.coordinate.__typename`
      - `location.address.coordinate.lat`
      - `location.address.coordinate.lon`
      - `location.address.coordinate.accuracy`
  - `location.street_view_url`
  - `location.county`
    - `location.county.__typename`
    - `location.county.fips_code`
- `open_houses`
- `description`
  - `description.__typename`
  - `description.sub_type`
  - `description.type`
  - `description.beds`
  - `description.baths`
  - `description.lot_sqft`
  - `description.sqft`
  - `description.beds_max`
  - `description.beds_min`
  - `description.sqft_max`
  - `description.sqft_min`
  - `description.baths_full`
  - `description.baths_half`
  - `description.baths_min`
  - `description.baths_max`
  - `description.baths_full_calc`
  - `description.baths_partial_calc`
- `virtual_tours`
- `matterport`
- `advertisers[]`
  - `advertisers[].__typename`
  - `advertisers[].fulfillment_id`
  - `advertisers[].name`
  - `advertisers[].email`
  - `advertisers[].href`
  - `advertisers[].slogan`
  - `advertisers[].type`
- `flags`
  - `flags.__typename`
  - `flags.is_price_reduced`
  - `flags.is_new_construction`
  - `flags.is_foreclosure`
  - `flags.is_plan`
  - `flags.is_new_listing`
  - `flags.is_coming_soon`
  - `flags.is_contingent`
  - `flags.is_pending`
- `source`
  - `source.__typename`
  - `source.agents[]`
    - `source.agents[].__typename`
    - `source.agents[].id`
    - `source.agents[].agent_id`
    - `source.agents[].agent_name`
    - `source.agents[].office_id`
    - `source.agents[].office_name`
  - `source.id`
  - `source.type`
  - `source.spec_id`
  - `source.plan_id`
  - `source.listing_href`
  - `source.listing_id`
- `pet_policy`
- `community`
- `primary_photo`
  - `primary_photo.__typename`
  - `primary_photo.href`
- `href`
- `list_price`
- `list_price_min`
- `list_price_max`
- `price_reduced_amount`
- `estimate`
  - `estimate.__typename`
  - `estimate.estimate`
- `lead_attributes`
  - `lead_attributes.__typename`
  - `lead_attributes.lead_type`
  - `lead_attributes.show_contact_an_agent`
  - `lead_attributes.opcity_lead_attributes.__typename`
  - `lead_attributes.opcity_lead_attributes.flip_the_market_enabled`
- `last_sold_date`
- `list_date`
- `products`
  - `products.__typename`
  - `products.brand_name`
  - `products.products[]`
- `last_sold_price`

## UI mappings and recommendations

### Display fields
- `status`: humanize (`for_sale` → `For sale`)
- `list_price`: primary display price
- `photo_count`: gallery badge
- `branding[].name`: agent/broker company name
- `location.address.line`, `city`, `state_code`, `postal_code`: formatted address
- `location.address.coordinate.lat/lon`: map pin
- `description.type|sub_type`: property type
- `description.beds`, `description.baths`, `description.sqft`, `description.lot_sqft`: stats
- `advertisers[]`: agent contacts
- `flags.*`: status badges (new listing, price reduced, foreclosure, etc.)
- `source.agents[]`: listing agents / broker team
- `primary_photo.href`: hero image
- `pet_policy`: pet rules
- `community`: community description
- `list_date`, `last_sold_date`, `last_sold_price`: listing history

### Internal-only / hidden fields
- `__typename`
- `plan_id`
- `source.spec_id`
- `source.plan_id`
- `source.listing_href` (unless used for canonical URL resolution)
- raw provider internals like `lead_attributes.opcity_lead_attributes` unless needed for business logic
- non-display ids such as `property_id`/`listing_id` if already replaced by UI-friendly labels

### Fallbacks needed
- Address fallback if `location.address.line` is missing
- `description.sqft` or `description.lot_sqft` fallback to `sqft_min/max` if present
- `advertisers[].email` fallback to `contact agent` button rather than blank text
- `formatPrice()` fallback on `list_price` missing: `Price unavailable`
- `virtual_tours`/`matterport` null: hide virtual tour section
- map fallback if coordinates unavailable
- `photo_count` / `primary_photo` fallback to placeholder image
- `description.beds` / `description.baths` null => `—`

### Derived transformations
- Price: `formatPrice(list_price)`
- Area: `formatSqft(description.sqft || description.lot_sqft)`
- Address: `formatAddress(line, city, state_code, postal_code)`
- Dates: `new Date(list_date).toLocaleDateString(...)`
- Agent name: `advertisers[0].name || source.agents[0].agent_name`
- Gallery images: `primary_photo.href`, then normalized `photos[]` strings/objects

### Missing fields in sample JSON
- `photos` array is not present in sample, so gallery must be derived from `primary_photo` or API photos endpoint
- `description.text`/`summary` for property description
- `features`, `amenities`, `interior_features`, `exterior_features`
- `parking`, `heating`, `cooling`, `utilities`, `appliances`
- `virtual_tours`: null
- `open_houses`: null
- `schools`, `nearby_places`, `walkscore`, `transitscore`, `bikescore`
- `hoa`, `taxes`, `insurance`, `rent_estimate`

## Recommended Schema.org structure
- `@type`: `SingleFamilyResidence` or `Residence`
- `name`: `description.name || listing address`
- `description`: property description summary
- `image`: gallery image URLs
- `address`: PostalAddress (`streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, `addressCountry`)
- `geo`: `latitude`, `longitude`
- `offers`: price, priceCurrency=USD, availability derived from `status`
- `seller`: `RealEstateAgent` or `Organization`
- `datePosted`: `list_date`

## Added files
- `frontend/property-schema.json`: JSON Schema for the normalized property payload.

## Notes
- This source object matches the RapidAPI MLS search format rather than a fully normalized property detail payload.
- Use the backend property API to normalize fields before rendering in the frontend.
- A second artifact should be created if you want a full JSON schema or OpenAPI fragment.
