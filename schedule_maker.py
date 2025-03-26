import requests
import numpy as np
import heapq
import itertools

# 캐싱을 위한 전역 변수
coordinate_cache = {}
distance_matrix_cache = {}

def get_coordinate(place_names):
    """
    Fetch coordinates (latitude and longitude) for given place names using Kakao API.
    """
    global coordinate_cache
    coordinates = []

    for place_name in place_names:
        # Check if the coordinate is cached
        if place_name in coordinate_cache:
            coordinates.append(coordinate_cache[place_name])
            continue

        url = f'https://dapi.kakao.com/v2/local/search/keyword.json?query={place_name}'
        headers = {"Authorization": "KakaoAK 27e3e2bffed2464908e54ca9b2062cd9"}

        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                info = response.json().get('documents', [])
                if info:
                    coord = {'lon': float(info[0]['x']), 'lat': float(info[0]['y'])}
                    coordinates.append(coord)
                    coordinate_cache[place_name] = coord  # Cache the result
                else:
                    print(f"No result found for {place_name}")
            else:
                print(f"Kakao API Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Error occurred while fetching coordinates for {place_name}: {e}")

    return coordinates

def get_distance_matrix(coordinates):
    """
    Compute the distance matrix using Tmap API for given coordinates.
    """
    global distance_matrix_cache
    n = len(coordinates)

    # Check if the distance matrix is cached
    coord_key = tuple((coord['lon'], coord['lat']) for coord in coordinates)
    if coord_key in distance_matrix_cache:
        return distance_matrix_cache[coord_key]

    tmap_api_key = "4zEO17lmTn1GfYU4fKQV60ml2mfXu806LyXmGhW1"
    tmap_distance_url = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json"
    distance_matrix = np.zeros((n, n))

    headers = {
        "Content-Type": "application/json",
        "appKey": tmap_api_key
    }

    for i in range(n):
        for j in range(n):
            if i != j:
                payload = {
                    "startX": coordinates[i]['lon'],
                    "startY": coordinates[i]['lat'],
                    "endX": coordinates[j]['lon'],
                    "endY": coordinates[j]['lat'],
                    "reqCoordType": "WGS84GEO",
                    "resCoordType": "WGS84GEO",
                    "startName": "출발지",
                    "endName": "도착지"
                }
                try:
                    response = requests.post(tmap_distance_url, json=payload, headers=headers)
                    if response.status_code == 200:
                        route_sections = response.json().get("features", [])
                        total_distance = sum(
                            feature["properties"]["distance"] for feature in route_sections if "distance" in feature["properties"]
                        )
                        distance_matrix[i][j] = total_distance if total_distance > 0 else np.inf
                    else:
                        print(f"Tmap API Error {response.status_code}: {response.text}")
                        distance_matrix[i][j] = np.inf
                except Exception as e:
                    print(f"Error occurred while fetching distance from {i} to {j}: {e}")
                    distance_matrix[i][j] = np.inf

    distance_matrix_cache[coord_key] = distance_matrix  # Cache the result
    return distance_matrix

def astar_shortest_path(place_names, start_index=0):
    """
    Compute the shortest path visiting all places using A* algorithm.
    """
    coordinates = get_coordinate(place_names)
    if not coordinates:
        print("No valid coordinates found.")
        return None, float("inf")

    distance_matrix = get_distance_matrix(coordinates)
    n = len(distance_matrix)
    queue = [(0, 0, [start_index])]  # Priority queue: (estimated_cost, current_distance, path)
    best_path = None
    min_distance = float("inf")

    while queue:
        estimated_cost, distance_so_far, path = heapq.heappop(queue)
        if len(path) == n:
            if distance_so_far < min_distance:
                min_distance = distance_so_far
                best_path = path
            continue

        last_node = path[-1]
        for neighbor in range(n):
            if neighbor not in path:
                new_path = path + [neighbor]
                new_distance = distance_so_far + distance_matrix[last_node][neighbor]
                estimated_distance = new_distance + min(
                    [distance_matrix[neighbor][i] for i in range(n) if i not in new_path] + [0]
                )
                heapq.heappush(queue, (estimated_distance, new_distance, new_path))

    if not best_path:
        print("A* failed to find a valid path.")
    return [place_names[i] for i in best_path], min_distance

def tsp_shortest_path(place_names):
    """
    Compute the shortest circular path visiting all places using brute force (TSP).
    """
    coordinates = get_coordinate(place_names)
    if not coordinates:
        print("No valid coordinates found.")
        return None, float("inf")

    distance_matrix = get_distance_matrix(coordinates)
    n = len(distance_matrix)
    best_path = None
    min_cost = float("inf")

    for perm in itertools.permutations(range(1, n)):
        current_path = [0] + list(perm) + [0]
        current_cost = sum(distance_matrix[current_path[i]][current_path[i + 1]] for i in range(len(current_path) - 1))
        if current_cost < min_cost:
            min_cost = current_cost
            best_path = current_path

    return [place_names[i] for i in best_path], min_cost

# Example usage
if __name__ == "__main__":
    place_names = ["꽁뚜식당", "바다횟집", "장승마을", "부추해물칼국수"]
    astar_path, astar_distance = astar_shortest_path(place_names)
    print("A* Shortest Path:", astar_path)
    print("A* Total Distance:", astar_distance)

    tsp_path, tsp_distance = tsp_shortest_path(place_names)
    print("TSP Shortest Circular Path:", tsp_path)
    print("TSP Total Distance:", tsp_distance)
