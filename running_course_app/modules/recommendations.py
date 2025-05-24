import math

def calculate_distance(coord1, coord2):
    R = 6371 # Earth radius in kilometers
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def calculate_path_length(path_coords):
    if not path_coords or len(path_coords) < 2:
        return 0.0
    total_length = 0.0
    for i in range(len(path_coords) - 1):
        total_length += calculate_distance(path_coords[i], path_coords[i+1])
    return total_length

def recommend_courses(osm_paths, desired_distance_km, tolerance_km=1.0):
    recommended = []
    min_len = desired_distance_km - tolerance_km
    max_len = desired_distance_km + tolerance_km
    # print(f"Debug: Desired distance {desired_distance_km}km, tolerance {tolerance_km}km. Min/Max: {min_len}/{max_len}")
    for i, path in enumerate(osm_paths):
        length = calculate_path_length(path)
        # print(f"Debug: Path {i} original length: {length}km")
        if min_len <= length <= max_len:
            recommended.append({
                "id": f"path_{i}",
                "coordinates": path,
                "length_km": round(length, 2)
            })
    # print(f"Debug: Found {len(recommended)} courses within range.")
    return recommended
