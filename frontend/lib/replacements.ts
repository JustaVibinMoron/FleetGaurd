import { availableCapacity } from "@/lib/trucks";
import type { PartnerTruck } from "@/lib/types";

export type ReplacementScore = {
  truck: PartnerTruck;
  score: number;
  reason: string;
  availableTons: number;
};

/**
 * Rank partner trucks for an emergency replacement.
 * Later this can call a matching API / geospatial query.
 */
export function rankReplacementTrucks(
  partners: PartnerTruck[],
  neededCapacity: number,
  destination: string,
): ReplacementScore[] {
  return partners
    .map((truck) => {
      const availableTons = availableCapacity(truck);
      let score = 0;
      const reasons: string[] = [];

      if (truck.status === "available") {
        score += 40;
      } else {
        score -= 30;
      }

      if (availableTons >= neededCapacity) {
        score += 30;
        reasons.push("sufficient capacity");
      } else {
        score -= 20;
        reasons.push("insufficient remaining capacity");
      }

      score += Math.max(0, 25 - truck.distanceKm);
      reasons.push(`${truck.distanceKm} km away`);

      const destOk = truck.compatibleDestinations.some(
        (d) => d.toLowerCase() === destination.toLowerCase(),
      );
      if (destOk) {
        score += 15;
        reasons.push("destination compatible");
      }

      const reason =
        truck.status !== "available"
          ? `${truck.company} is not currently available.`
          : availableTons >= neededCapacity
            ? "Closest available truck with sufficient capacity."
            : reasons.join("; ");

      return { truck, score, reason, availableTons };
    })
    .sort((a, b) => b.score - a.score);
}

export function bestReplacement(
  partners: PartnerTruck[],
  neededCapacity: number,
  destination: string,
) {
  const ranked = rankReplacementTrucks(partners, neededCapacity, destination);
  return ranked.find((row) => row.truck.status === "available" && row.availableTons >= neededCapacity) ?? ranked[0];
}
