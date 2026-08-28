"""Distance/time matrix preparation for the routing solver."""

import math
from typing import Optional, Sequence, Tuple

from backend.optimizer.objectives import SolverConfig
from backend.optimizer.schemas import DeliveryInput, TravelMatrix, VehicleInput
from backend.utils.exceptions import AppError


Location = Tuple[float, float]


def parse_clock(value: str) -> int:
    """Parse 'HH:MM' into minutes from midnight."""
    parts = value.strip().split(":")
    if len(parts) != 2:
        raise AppError("OPTIMIZER_INVALID_INPUT", "Time windows must use HH:MM", 400)
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
    except ValueError as exc:
        raise AppError("OPTIMIZER_INVALID_INPUT", "Time windows must use HH:MM", 400) from exc
    if hours < 0 or hours > 23 or minutes < 0 or minutes > 59:
        raise AppError("OPTIMIZER_INVALID_INPUT", "Time windows must use HH:MM", 400)
    return hours * 60 + minutes


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def locations_for(vehicles: Sequence[VehicleInput], deliveries: Sequence[DeliveryInput]) -> list[Location]:
    points: list[Location] = []
    for vehicle in vehicles:
        points.append((vehicle.current_location.latitude, vehicle.current_location.longitude))
    for delivery in deliveries:
        points.append((delivery.latitude, delivery.longitude))
    return points


def _square(matrix: Sequence[Sequence[float]]) -> None:
    size = len(matrix)
    if size == 0:
        raise AppError("OPTIMIZER_INVALID_INPUT", "Travel matrix must not be empty", 400)
    for row in matrix:
        if len(row) != size:
            raise AppError("OPTIMIZER_INVALID_INPUT", "Travel matrix must be square", 400)


def _expand_shared_depot(matrix: list[list[float]], vehicle_count: int) -> list[list[float]]:
    delivery_count = len(matrix) - 1
    size = vehicle_count + delivery_count
    expanded = [[0.0] * size for _ in range(size)]
    for i in range(size):
        old_i = 0 if i < vehicle_count else i - vehicle_count + 1
        for j in range(size):
            old_j = 0 if j < vehicle_count else j - vehicle_count + 1
            expanded[i][j] = float(matrix[old_i][old_j])
    return expanded


def normalize_matrix(
    matrix: Sequence[Sequence[float]],
    vehicle_count: int,
    delivery_count: int,
) -> list[list[float]]:
    _square(matrix)
    size = len(matrix)
    expected = vehicle_count + delivery_count
    if size == expected:
        return [[float(cell) for cell in row] for row in matrix]
    if size == delivery_count + 1 and vehicle_count >= 1:
        return _expand_shared_depot([[float(cell) for cell in row] for row in matrix], vehicle_count)
    raise AppError(
        "OPTIMIZER_INVALID_INPUT",
        "Travel matrix size must be vehicles+deliveries or 1+deliveries",
        400,
    )


def build_haversine_matrix(
    points: Sequence[Location],
    speed_kmh: float,
) -> TravelMatrix:
    size = len(points)
    distance = [[0.0] * size for _ in range(size)]
    duration = [[0.0] * size for _ in range(size)]
    speed = max(float(speed_kmh), 0.1)
    for i, (lat1, lon1) in enumerate(points):
        for j, (lat2, lon2) in enumerate(points):
            if i == j:
                continue
            km = haversine_km(lat1, lon1, lat2, lon2)
            distance[i][j] = round(km, 3)
            duration[i][j] = round((km / speed) * 60.0, 1)
    return TravelMatrix(distance_km=distance, duration_minutes=duration)


def build_osrm_matrix(points: Sequence[Location]) -> TravelMatrix:
    from backend.maps.osrm_client import get_table

    coordinates = [(lon, lat) for lat, lon in points]
    table = get_table(coordinates)
    return TravelMatrix(
        distance_km=table["distanceKm"],
        duration_minutes=table["durationMinutes"],
    )


def fetch_route_geometry(points: Sequence[Location]) -> Optional[dict]:
    if len(points) < 2:
        return None
    from backend.maps.osrm_client import get_route_waypoints
    from backend.utils.exceptions import AppError as MapsError

    coordinates = [(lon, lat) for lat, lon in points]
    try:
        result = get_route_waypoints(coordinates)
    except MapsError:
        return None
    return result.get("geometry")


def prepare_travel_matrix(
    vehicles: Sequence[VehicleInput],
    deliveries: Sequence[DeliveryInput],
    travel_matrix: Optional[TravelMatrix],
    solver: SolverConfig,
    use_osrm: bool,
) -> TravelMatrix:
    expected = len(vehicles) + len(deliveries)
    if expected == 0:
        return TravelMatrix(distance_km=[], duration_minutes=[])

    if travel_matrix is not None:
        distance = normalize_matrix(travel_matrix.distance_km, len(vehicles), len(deliveries))
        duration = normalize_matrix(travel_matrix.duration_minutes, len(vehicles), len(deliveries))
        return TravelMatrix(distance_km=distance, duration_minutes=duration)

    points = locations_for(vehicles, deliveries)
    if use_osrm:
        try:
            matrix = build_osrm_matrix(points)
            return TravelMatrix(
                distance_km=normalize_matrix(matrix.distance_km, len(vehicles), len(deliveries)),
                duration_minutes=normalize_matrix(matrix.duration_minutes, len(vehicles), len(deliveries)),
            )
        except Exception:
            pass
    return build_haversine_matrix(points, solver.assume_speed_kmh)


def slice_matrix(matrix: TravelMatrix, keep_nodes: Sequence[int]) -> TravelMatrix:
    distance = [[matrix.distance_km[i][j] for j in keep_nodes] for i in keep_nodes]
    duration = [[matrix.duration_minutes[i][j] for j in keep_nodes] for i in keep_nodes]
    return TravelMatrix(distance_km=distance, duration_minutes=duration)


def align_matrix_to_vehicles(
    matrix: TravelMatrix,
    original_vehicles: Sequence[VehicleInput],
    usable_vehicles: Sequence[VehicleInput],
    deliveries: Sequence[DeliveryInput],
) -> TravelMatrix:
    usable_ids = {vehicle.id for vehicle in usable_vehicles}
    full_size = len(original_vehicles) + len(deliveries)
    usable_size = len(usable_vehicles) + len(deliveries)
    size = len(matrix.distance_km)

    if size == usable_size:
        return TravelMatrix(
            distance_km=normalize_matrix(matrix.distance_km, len(usable_vehicles), len(deliveries)),
            duration_minutes=normalize_matrix(matrix.duration_minutes, len(usable_vehicles), len(deliveries)),
        )

    if size == full_size:
        keep = [index for index, vehicle in enumerate(original_vehicles) if vehicle.id in usable_ids]
        keep.extend(range(len(original_vehicles), full_size))
        sliced = slice_matrix(matrix, keep)
        return TravelMatrix(
            distance_km=normalize_matrix(sliced.distance_km, len(usable_vehicles), len(deliveries)),
            duration_minutes=normalize_matrix(sliced.duration_minutes, len(usable_vehicles), len(deliveries)),
        )

    return TravelMatrix(
        distance_km=normalize_matrix(matrix.distance_km, len(usable_vehicles), len(deliveries)),
        duration_minutes=normalize_matrix(matrix.duration_minutes, len(usable_vehicles), len(deliveries)),
    )
