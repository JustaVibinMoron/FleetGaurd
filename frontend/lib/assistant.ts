import { isOverloaded, statusLabel } from "@/lib/trucks";
import { bestReplacement } from "@/lib/replacements";
import type { PartnerTruck, Truck } from "@/lib/types";

/**
 * Rule-based logistics assistant for the prototype.
 * Swap answerFleetQuestion() with a call to /api/ai (server route) later.
 */
export function answerFleetQuestion(
  question: string,
  trucks: Truck[],
  partners: PartnerTruck[],
) {
  const q = question.toLowerCase();
  const delayed = trucks.filter((t) => t.status === "delayed");
  const overloaded = trucks.filter(isOverloaded);
  const emergency = trucks.filter((t) => t.status === "emergency");

  if (q.includes("delayed")) {
    if (!delayed.length) return "No trucks are currently marked as delayed.";
    return delayed
      .map((t) => `${t.id} (${t.driver}) is delayed en route to ${t.destination}. Current ETA ${t.eta}.`)
      .join(" ");
  }

  if (q.includes("overload") || q.includes("overloaded")) {
    if (!overloaded.length) return "No trucks are currently overloaded.";
    return overloaded
      .map((t) => {
        const extra = (t.load - t.capacity).toFixed(1);
        return `Truck ${t.id} is currently overloaded by ${extra} tons. Maximum capacity is ${t.capacity} tons and current load is ${t.load} tons.`;
      })
      .join(" ");
  }

  if (q.includes("emergency") || q.includes("emergencies")) {
    if (!emergency.length) return "There are no open emergency trucks right now.";
    return emergency
      .map((t) => `${t.id} is in emergency status near ${t.location}, destination ${t.destination}.`)
      .join(" ");
  }

  if (q.includes("replacement") || q.includes("replace")) {
    const match = q.match(/t-\d+/i);
    const truckId = match ? match[0].toUpperCase() : "T-104";
    const truck = trucks.find((t) => t.id === truckId) ?? trucks.find((t) => t.status === "emergency");
    if (!truck) return "I could not find that truck in the fleet.";
    const rec = bestReplacement(partners, truck.load, truck.destination);
    if (!rec) return "No partner trucks are available.";
    return `Recommended replacement for ${truck.id}: ${rec.truck.id} from ${rec.truck.company}, ${rec.truck.distanceKm} km away, ${rec.availableTons} tons free. ${rec.reason}`;
  }

  if (q.includes("closest") && q.includes("partner")) {
    const match = q.match(/t-\d+/i);
    const truckId = match ? match[0].toUpperCase() : "T-104";
    const truck = trucks.find((t) => t.id === truckId);
    const dest = truck?.destination ?? "Bhubaneswar";
    const rec = bestReplacement(partners, truck?.load ?? 8, dest);
    if (!rec) return "No partner trucks nearby.";
    return `The closest suitable partner truck to ${truckId} is ${rec.truck.id} (${rec.truck.company}) at ${rec.truck.distanceKm} km.`;
  }

  if (q.includes("status") || q.includes("where")) {
    const match = q.match(/t-\d+/i);
    if (match) {
      const truck = trucks.find((t) => t.id === match[0].toUpperCase());
      if (!truck) return `I could not find ${match[0].toUpperCase()}.`;
      return `${truck.id} is ${statusLabel(truck.status).toLowerCase()} at ${truck.location}, speed ${truck.speed} km/h, load ${truck.load}/${truck.capacity} t, destination ${truck.destination}.`;
    }
  }

  const active = trucks.filter((t) => t.status !== "offline" && t.status !== "available").length;
  return `I can help with delayed trucks, overloads, emergencies, and partner replacements. Right now ${active} trucks are moving or in incident state. Try: "Which trucks are delayed?"`;
}
