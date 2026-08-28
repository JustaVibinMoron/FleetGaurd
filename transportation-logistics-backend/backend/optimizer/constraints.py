"""Capacity, time-window, and drop constraints for the OR-Tools model."""

from ortools.constraint_solver import pywrapcp

from backend.optimizer.objectives import OptimizationWeights, delay_penalty_per_minute, drop_penalty


def add_capacity_constraint(routing: pywrapcp.RoutingModel, manager: pywrapcp.RoutingIndexManager, data: dict) -> None:
    def demand_callback(from_index: int) -> int:
        node = manager.IndexToNode(from_index)
        return int(data["demands"][node])

    demand_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_index,
        0,
        data["vehicle_capacities"],
        True,
        "Capacity",
    )


def add_time_windows(
    routing: pywrapcp.RoutingModel,
    manager: pywrapcp.RoutingIndexManager,
    data: dict,
    weights: OptimizationWeights,
) -> str:
    def time_callback(from_index: int, to_index: int) -> int:
        frm = manager.IndexToNode(from_index)
        to = manager.IndexToNode(to_index)
        return int(data["duration_min"][frm][to]) + int(data["service_min"][frm])

    time_index = routing.RegisterTransitCallback(time_callback)
    horizon = int(data["horizon"])
    routing.AddDimension(
        time_index,
        horizon,
        horizon,
        False,
        "Time",
    )
    time_dimension = routing.GetDimensionOrDie("Time")
    vehicle_count = data["vehicle_count"]

    for node in range(len(data["demands"])):
        try:
            index = manager.NodeToIndex(node)
        except Exception:
            continue
        if index < 0 or routing.IsStart(index) or routing.IsEnd(index):
            continue
        start, hard_end, soft_end = data["time_windows"][node]
        hard_end = min(int(hard_end), horizon)
        soft_end = min(int(soft_end), horizon)
        time_dimension.CumulVar(index).SetRange(int(start), int(hard_end))
        if node >= vehicle_count:
            delivery = data["deliveries"][node - vehicle_count]
            time_dimension.SetCumulVarSoftUpperBound(
                index,
                int(soft_end),
                delay_penalty_per_minute(delivery.priority.value, weights),
            )

    for vehicle_id in range(routing.vehicles()):
        start_index = routing.Start(vehicle_id)
        end_index = routing.End(vehicle_id)
        shift_start = int(data["shift_start"])
        time_dimension.CumulVar(start_index).SetRange(shift_start, horizon)
        time_dimension.CumulVar(end_index).SetRange(shift_start, horizon)
        routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(start_index))
        routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(end_index))

    return "Time"


def add_disjunctions(
    routing: pywrapcp.RoutingModel,
    manager: pywrapcp.RoutingIndexManager,
    data: dict,
    weights: OptimizationWeights,
) -> None:
    vehicle_count = data["vehicle_count"]
    for offset, delivery in enumerate(data["deliveries"]):
        node = vehicle_count + offset
        routing.AddDisjunction(
            [manager.NodeToIndex(node)],
            drop_penalty(delivery.priority.value, weights, data["max_arc_cost"], len(data["demands"])),
        )
