UPDATE "member_reviews"
SET
  "overall_rating" = CASE WHEN "overall_rating" BETWEEN 1 AND 5 THEN "overall_rating" * 2 ELSE "overall_rating" END,
  "reliability_rating" = CASE WHEN "reliability_rating" BETWEEN 1 AND 5 THEN "reliability_rating" * 2 ELSE "reliability_rating" END,
  "professionalism_rating" = CASE WHEN "professionalism_rating" BETWEEN 1 AND 5 THEN "professionalism_rating" * 2 ELSE "professionalism_rating" END,
  "updated_at" = now();
