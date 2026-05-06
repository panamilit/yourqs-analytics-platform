def calculate_cost_per_m2(total_cost: float, floor_area: float):
    if floor_area <= 0:
        return None
    
    cost = total_cost / floor_area
    return round(cost, 2)


def calculate_margin(total_cost: float, total_selling_price: float):
    margin = total_selling_price - total_cost
    return round(margin, 2)


def calculate_margin_percentage(total_cost: float, total_selling_price: float):
    if total_selling_price <= 0:
        return None
    
    margin_percentage = (
        (total_selling_price - total_cost) / total_selling_price) * 100
    return round(margin_percentage, 2)


def calculate_avg_item_cost(total_cost: float, item_count: int):
    if item_count <= 0:
        return None
    
    avg_cost = total_cost / item_count
    return round(avg_cost, 2)


