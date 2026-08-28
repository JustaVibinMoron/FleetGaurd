"""Public optimization entry point. Stateless: each call uses the given fleet and deliveries."""

from typing import Optional, Union

from backend.optimizer.matrix import align_matrix_to_vehicles, fetch_route_geometry, parse_clock, prepare_travel_matrix
from backend.optimizer.objectives import OptimizationWeights, SolverConfig
from backend.optimizer.routing import RoutingSolution, solve_routing
from backend.optimizer.schemas import (
    DeliveryInput,
    DeliveryPriority,
    GeoPoint,
    OptimizationMetrics,
    OptimizationRequest,
    OptimizedPlan,
    OptimizedRoute,
    TravelMatrix,
    UnassignedDelivery,
    VehicleInput,
)


def _as_request(payload: Union[OptimizationRequest, dict]) -> OptimizationRequest:
    if isinstance(payload, OptimizationRequest):
        return payload
    return OptimizationRequest.model_validate(payload)


def _usable_vehicles(vehicles: list[VehicleInput]) -> list[VehicleInput]:
    usable = []
    for vehicle in vehicles:
        if not vehicle.available:
            continue
        if vehicle.available_capacity_kg <= 0:
            continue
        usable.append(vehicle)
    return usable


def _window_tuple(
    delivery: DeliveryInput,
    shift_start: int,
    horizon: int,
    max_delay: int,
) -> tuple[int, int, int]:
    if delivery.time_window is None:
        return shift_start, 10**9, 10**9
    start = max(shift_start, parse_clock(delivery.time_window.start))
    end = parse_clock(delivery.time_window.end)
    if end < start:
        end = start
    hard_end = min(horizon, end + max_delay)
    return start, hard_end, end


def _prefilter(
    vehicles: list[VehicleInput],
    deliveries: list[DeliveryInput],
) -> tuple[list[DeliveryInput], list[UnassignedDelivery]]:
    kept: list[DeliveryInput] = []
    skipped: list[UnassignedDelivery] = []
    if not vehicles:
        for delivery in deliveries:
            skipped.append(UnassignedDelivery(delivery_id=delivery.id, reason="No available vehicles"))
        return kept, skipped

    max_capacity = max(vehicle.available_capacity_kg for vehicle in vehicles)
    for delivery in deliveries:
        if delivery.load_kg > max_capacity:
            skipped.append(UnassignedDelivery(delivery_id=delivery.id, reason="Exceeds vehicle capacity"))
            continue
        kept.append(delivery)
    return kept, skipped


def _empty_metrics() -> OptimizationMetrics:
    return OptimizationMetrics(
        total_distance_km=0.0,
        total_time_minutes=0.0,
        delayed_deliveries=0,
        priority_deliveries_completed=0,
        vehicle_utilization=0.0,
        assigned_deliveries=0,
        unassigned_count=0,
    )


def _metrics(
    routes: list[OptimizedRoute],
    deliveries: list[DeliveryInput],
    assigned_ids: set,
    delayed: int,
    vehicles: list[VehicleInput],
    unassigned_count: int,
) -> OptimizationMetrics:
    total_distance = round(sum(route.distance_km for route in routes), 3)
    total_time = round(sum(route.estimated_time_minutes for route in routes), 1)
    priority_completed = 0
    assigned_load = 0.0
    by_id = {item.id: item for item in deliveries}
    for delivery_id in assigned_ids:
        item = by_id.get(delivery_id)
        if item is None:
            continue
        assigned_load += float(item.load_kg)
        if item.priority == DeliveryPriority.HIGH:
            priority_completed += 1
    fleet_capacity = sum(vehicle.available_capacity_kg for vehicle in vehicles)
    utilization = 0.0 if fleet_capacity <= 0 else min(1.0, assigned_load / fleet_capacity)
    return OptimizationMetrics(
        total_distance_km=total_distance,
        total_time_minutes=total_time,
        delayed_deliveries=delayed,
        priority_deliveries_completed=priority_completed,
        vehicle_utilization=round(utilization, 4),
        assigned_deliveries=len(assigned_ids),
        unassigned_count=unassigned_count,
    )


def _attach_geometry(
    route: OptimizedRoute,
    vehicle: VehicleInput,
    deliveries: list[DeliveryInput],
) -> OptimizedRoute:
    by_id = {item.id: item for item in deliveries}
    points = [(vehicle.current_location.latitude, vehicle.current_location.longitude)]
    for delivery_id in route.delivery_ids:
        item = by_id.get(delivery_id)
        if item is not None:
            points.append((item.latitude, item.longitude))
    points.append((vehicle.current_location.latitude, vehicle.current_location.longitude))
    geometry = fetch_route_geometry(points)
    if geometry is None:
        return route
    return route.model_copy(update={"geometry": geometry})


def optimize(payload: Union[OptimizationRequest, dict]) -> OptimizedPlan:
    request = _as_request(payload)
    vehicles = _usable_vehicles(list(request.vehicles))
    deliveries = list(request.deliveries)

    if not deliveries and not vehicles:
        return OptimizedPlan(routes=[], metrics=_empty_metrics(), unassigned_deliveries=[])

    routable, unassigned = _prefilter(vehicles, deliveries)
    if not vehicles or not routable:
        metrics = _metrics([], deliveries, set(), 0, vehicles, len(unassigned))
        return OptimizedPlan(routes=[], metrics=metrics, unassigned_deliveries=unassigned)

    matrix = prepare_travel_matrix(
        vehicles,
        routable,
        None if request.travel_matrix is None else align_matrix_to_vehicles(
            request.travel_matrix,
            list(request.vehicles),
            vehicles,
            routable,
        ),
        request.solver,
        use_osrm=request.travel_matrix is None,
    )
    shift_start = parse_clock(request.shift_start)
    horizon = int(request.solver.planning_horizon_minutes)
    max_delay = int(request.solver.max_delay_minutes)

    time_windows = [(shift_start, horizon, horizon)] * len(vehicles)
    service = [0] * len(vehicles)
    for delivery in routable:
        time_windows.append(_window_tuple(delivery, shift_start, horizon, max_delay))
        service.append(int(delivery.service_time_minutes))

    solution = solve_routing(
        vehicles=vehicles,
        deliveries=routable,
        distance_km=matrix.distance_km,
        duration_minutes=matrix.duration_minutes,
        weights=request.weights,
        solver=request.solver,
        shift_start_minutes=shift_start,
        time_windows=time_windows,
        service_minutes=service,
    )

    if solution is None:
        for delivery in routable:
            unassigned.append(UnassignedDelivery(delivery_id=delivery.id, reason="No feasible vehicle"))
        metrics = _metrics([], deliveries, set(), 0, vehicles, len(unassigned))
        return OptimizedPlan(routes=[], metrics=metrics, unassigned_deliveries=unassigned)

    return _plan_from_solution(request, vehicles, routable, deliveries, unassigned, solution, matrix)


def _plan_from_solution(
    request: OptimizationRequest,
    vehicles: list[VehicleInput],
    routable: list[DeliveryInput],
    all_deliveries: list[DeliveryInput],
    unassigned: list[UnassignedDelivery],
    solution: RoutingSolution,
    matrix: TravelMatrix,
) -> OptimizedPlan:
    routes: list[OptimizedRoute] = []
    assigned_ids: set = set()
    delayed = 0
    shift_start = parse_clock(request.shift_start)
    horizon = int(request.solver.planning_horizon_minutes)
    max_delay = int(request.solver.max_delay_minutes)

    for solved in solution.routes:
        if not solved.delivery_offsets:
            continue
        vehicle = vehicles[solved.vehicle_index]
        delivery_ids = [routable[offset].id for offset in solved.delivery_offsets]
        assigned_ids.update(delivery_ids)
        for offset, arrival in zip(solved.delivery_offsets, solved.arrival_minutes):
            _start, _hard, soft_end = _window_tuple(routable[offset], shift_start, horizon, max_delay)
            if routable[offset].time_window is not None and arrival > soft_end:
                delayed += 1
        route = OptimizedRoute(
            vehicle_id=vehicle.id,
            delivery_ids=delivery_ids,
            distance_km=solved.distance_km,
            estimated_time_minutes=solved.time_minutes,
            load_kg=solved.load_kg,
        )
        if request.fetch_geometry:
            route = _attach_geometry(route, vehicle, routable)
        routes.append(route)

    for offset in solution.dropped_offsets:
        unassigned.append(UnassignedDelivery(delivery_id=routable[offset].id, reason="No feasible vehicle"))

    metrics = _metrics(routes, all_deliveries, assigned_ids, delayed, vehicles, len(unassigned))
    return OptimizedPlan(routes=routes, metrics=metrics, unassigned_deliveries=unassigned)


def optimize_from_context(context: dict) -> OptimizedPlan:
    """
    Accept either a full OptimizationRequest or the existing single-route
    optimize-context payload used by route_service.
    """
    if "vehicles" in context or "deliveries" in context:
        return optimize(context)

    distance = float(context.get("distanceKm") or context.get("distance_km") or 100)
    duration = float(context.get("estimatedTimeMinutes") or context.get("estimated_time_minutes") or max(distance * 1.5, 20))
    capacity = float(context.get("truckCapacityKg") or context.get("truck_capacity_kg") or 10000)
    current_load = float(context.get("currentLoadKg") or context.get("current_load_kg") or 0)
    load = max(1.0, min(capacity - current_load, capacity) if capacity > current_load else 1.0)
    priority_raw = str(context.get("deliveryPriority") or context.get("delivery_priority") or "MEDIUM").upper()
    if priority_raw not in {"HIGH", "MEDIUM", "LOW"}:
        priority_raw = "MEDIUM"
    delivery_id = context.get("deliveryId") or context.get("delivery_id") or "D1"

    request = OptimizationRequest(
        vehicles=[
            VehicleInput(
                id=context.get("truckId") or 1,
                capacity_kg=capacity,
                current_load_kg=current_load,
                current_location=GeoPoint(latitude=0, longitude=0),
                available=True,
            )
        ],
        deliveries=[
            DeliveryInput(
                id=delivery_id,
                latitude=0.5,
                longitude=0.5,
                load_kg=load,
                priority=DeliveryPriority(priority_raw),
            )
        ],
        travel_matrix=TravelMatrix(
            distance_km=[[0.0, distance], [distance, 0.0]],
            duration_minutes=[[0.0, duration], [duration, 0.0]],
        ),
        fetch_geometry=False,
    )
    return optimize(request)


def plan_to_legacy_payload(plan: OptimizedPlan, context: Optional[dict] = None) -> dict:
    context = context or {}
    if plan.routes:
        first = plan.routes[0]
        waypoints = [str(item) for item in first.delivery_ids]
        recommended = " -> ".join(["depot", *waypoints, "depot"])
        estimated = int(round(first.estimated_time_minutes or plan.metrics.total_time_minutes))
    else:
        origin = context.get("origin")
        destination = context.get("destination")
        recommended = "{0} -> {1}".format(origin, destination) if origin and destination else "No feasible route"
        estimated = int(round(plan.metrics.total_time_minutes)) or int(context.get("estimatedTimeMinutes") or 0)

    unassigned = len(plan.unassigned_deliveries)
    assigned = plan.metrics.assigned_deliveries
    reason = "OR-Tools VRP assigned {0} deliveries; {1} unassigned".format(assigned, unassigned)
    payload = plan.model_dump(by_alias=True, mode="json")
    payload.update(
        {
            "recommendedRoute": recommended,
            "estimatedTime": estimated,
            "fuelSaving": None,
            "reason": reason,
            "source": "ortools",
        }
    )
    return payload
