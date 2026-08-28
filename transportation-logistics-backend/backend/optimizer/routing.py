"""OR-Tools vehicle routing model."""

from dataclasses import dataclass
from typing import Optional

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from backend.optimizer.constraints import add_capacity_constraint, add_disjunctions, add_time_windows
from backend.optimizer.objectives import OptimizationWeights, SolverConfig, arc_cost
from backend.optimizer.schemas import DeliveryInput, VehicleInput


@dataclass
class SolvedRoute:
    vehicle_index: int
    delivery_offsets: list[int]
    distance_km: float
    time_minutes: float
    load_kg: float
    arrival_minutes: list[int]


@dataclass
class RoutingSolution:
    routes: list[SolvedRoute]
    dropped_offsets: list[int]


def _int_matrix(matrix: list[list[float]], scale: float) -> list[list[int]]:
    return [[max(0, int(round(float(cell) * scale))) for cell in row] for row in matrix]


def solve_routing(
    vehicles: list[VehicleInput],
    deliveries: list[DeliveryInput],
    distance_km: list[list[float]],
    duration_minutes: list[list[float]],
    weights: OptimizationWeights,
    solver: SolverConfig,
    shift_start_minutes: int,
    time_windows: list[tuple[int, int, int]],
    service_minutes: list[int],
) -> Optional[RoutingSolution]:
    vehicle_count = len(vehicles)
    if vehicle_count == 0:
        return RoutingSolution(routes=[], dropped_offsets=list(range(len(deliveries))))

    node_count = vehicle_count + len(deliveries)
    starts = list(range(vehicle_count))
    ends = list(range(vehicle_count))
    demands = [0] * vehicle_count + [max(0, int(round(item.load_kg))) for item in deliveries]
    capacities = [max(0, int(round(item.available_capacity_kg))) for item in vehicles]
    duration_min = _int_matrix(duration_minutes, 1.0)

    cost_matrix = [
        [arc_cost(distance_km[i][j], duration_minutes[i][j], weights) for j in range(node_count)]
        for i in range(node_count)
    ]
    max_arc = max((max(row) for row in cost_matrix), default=1) or 1
    max_leg = max((max(row) for row in duration_min), default=0)
    horizon = max(
        int(solver.planning_horizon_minutes),
        int(max_leg) * max(node_count, 1) + int(shift_start_minutes) + int(solver.max_delay_minutes) + 1,
    )

    manager = pywrapcp.RoutingIndexManager(node_count, vehicle_count, starts, ends)
    routing = pywrapcp.RoutingModel(manager)

    def cost_callback(from_index: int, to_index: int) -> int:
        frm = manager.IndexToNode(from_index)
        to = manager.IndexToNode(to_index)
        return cost_matrix[frm][to]

    cost_index = routing.RegisterTransitCallback(cost_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(cost_index)

    data = {
        "demands": demands,
        "vehicle_capacities": capacities,
        "duration_min": duration_min,
        "service_min": service_minutes,
        "time_windows": time_windows,
        "horizon": horizon,
        "shift_start": shift_start_minutes,
        "vehicle_count": vehicle_count,
        "deliveries": deliveries,
        "max_arc_cost": max_arc,
    }
    add_capacity_constraint(routing, manager, data)
    add_time_windows(routing, manager, data, weights)
    add_disjunctions(routing, manager, data, weights)

    search = pywrapcp.DefaultRoutingSearchParameters()
    search.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search.time_limit.FromMilliseconds(max(50, int(solver.time_limit_seconds * 1000)))

    solution = routing.SolveWithParameters(search)
    if solution is None:
        return None

    assigned: set[int] = set()
    routes: list[SolvedRoute] = []
    time_dimension = routing.GetDimensionOrDie("Time")

    for vehicle_index in range(vehicle_count):
        index = routing.Start(vehicle_index)
        offsets: list[int] = []
        arrivals: list[int] = []
        distance = 0.0
        load = 0.0
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            next_index = solution.Value(routing.NextVar(index))
            next_node = manager.IndexToNode(next_index)
            distance += float(distance_km[node][next_node])
            if node >= vehicle_count:
                offset = node - vehicle_count
                offsets.append(offset)
                assigned.add(offset)
                load += float(deliveries[offset].load_kg)
                arrivals.append(int(solution.Value(time_dimension.CumulVar(index))))
            index = next_index

        end_time = int(solution.Value(time_dimension.CumulVar(index)))
        start_time = int(solution.Value(time_dimension.CumulVar(routing.Start(vehicle_index))))
        routes.append(
            SolvedRoute(
                vehicle_index=vehicle_index,
                delivery_offsets=offsets,
                distance_km=round(distance, 3),
                time_minutes=float(max(0, end_time - start_time)),
                load_kg=load,
                arrival_minutes=arrivals,
            )
        )

    dropped = [offset for offset in range(len(deliveries)) if offset not in assigned]
    return RoutingSolution(routes=routes, dropped_offsets=dropped)
