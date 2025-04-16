import requests
import numpy as np
import heapq
import itertools

# 캐싱을 위한 전역 변수
PLACE_COORDINATE_CACHE = {}
PLACE_DISTANCE_MATRIX_CACHE = {}

def get_coordinate(place_names):
    """
    Fetch coordinates (latitude and longitude) for given place names using Kakao API.
    """
    global PLACE_COORDINATE_CACHE
    place_coordinates = []

    for place_name in place_names:
        # Check if the coordinate is cached
        if place_name in PLACE_COORDINATE_CACHE:
            place_coordinates.append(PLACE_COORDINATE_CACHE[place_name])
            continue

        kakao_search_url = f'https://dapi.kakao.com/v2/local/search/keyword.json?query={place_name}'
        kakao_headers = {"Authorization": "KakaoAK 27e3e2bffed2464908e54ca9b2062cd9"}

        try:
            kakao_response = requests.get(kakao_search_url, headers=kakao_headers)
            if kakao_response.status_code == 200:
                place_info = kakao_response.json().get('documents', [])
                if place_info:
                    place_coord = {'longitude': float(place_info[0]['x']), 'latitude': float(place_info[0]['y'])}
                    place_coordinates.append(place_coord)
                    PLACE_COORDINATE_CACHE[place_name] = place_coord  # Cache the result
                else:
                    print(f"No result found for {place_name}")
            else:
                print(f"Kakao API Error {kakao_response.status_code}: {kakao_response.text}")
        except Exception as e:
            print(f"Error occurred while fetching coordinates for {place_name}: {e}")

    return place_coordinates

def get_distance_matrix(place_coordinates):
    """
    Compute the distance matrix using Tmap API for given coordinates.
    """
    global PLACE_DISTANCE_MATRIX_CACHE
    num_places = len(place_coordinates)

    # Check if the distance matrix is cached
    coord_key = tuple((coord['longitude'], coord['latitude']) for coord in place_coordinates)
    if coord_key in PLACE_DISTANCE_MATRIX_CACHE:
        return PLACE_DISTANCE_MATRIX_CACHE[coord_key]

    TMAP_API_KEY = "4zEO17lmTn1GfYU4fKQV60ml2mfXu806LyXmGhW1"
    TMAP_DISTANCE_URL = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json"
    place_distance_matrix = np.zeros((num_places, num_places))

    tmap_headers = {
        "Content-Type": "application/json",
        "appKey": TMAP_API_KEY
    }

    for i in range(num_places):
        for j in range(num_places):
            if i != j:
                distance_payload = {
                    "startX": place_coordinates[i]['longitude'],
                    "startY": place_coordinates[i]['latitude'],
                    "endX": place_coordinates[j]['longitude'],
                    "endY": place_coordinates[j]['latitude'],
                    "reqCoordType": "WGS84GEO",
                    "resCoordType": "WGS84GEO",
                    "startName": "출발지",
                    "endName": "도착지"
                }
                try:
                    tmap_response = requests.post(TMAP_DISTANCE_URL, json=distance_payload, headers=tmap_headers)
                    if tmap_response.status_code == 200:
                        route_sections = tmap_response.json().get("features", [])
                        total_distance = sum(
                            feature["properties"]["distance"] for feature in route_sections if "distance" in feature["properties"]
                        )
                        place_distance_matrix[i][j] = total_distance if total_distance > 0 else np.inf
                    else:
                        print(f"Tmap API Error {tmap_response.status_code}: {tmap_response.text}")
                        place_distance_matrix[i][j] = np.inf
                except Exception as e:
                    print(f"Error occurred while fetching distance from {i} to {j}: {e}")
                    place_distance_matrix[i][j] = np.inf

    PLACE_DISTANCE_MATRIX_CACHE[coord_key] = place_distance_matrix  # Cache the result
    return place_distance_matrix

def astar_shortest_path(place_names, start_index=0):
    """
    Compute the shortest path visiting all places using A* algorithm.
    """
    place_coordinates = get_coordinate(place_names)
    if not place_coordinates:
        print("No valid coordinates found.")
        return None, float("inf")

    place_distance_matrix = get_distance_matrix(place_coordinates)
    num_places = len(place_distance_matrix)
    path_queue = [(0, 0, [start_index])]  # Priority queue: (estimated_cost, current_distance, path)
    optimal_path = None
    min_total_distance = float("inf")

    while path_queue:
        estimated_cost, current_distance, current_path = heapq.heappop(path_queue)
        if len(current_path) == num_places:
            if current_distance < min_total_distance:
                min_total_distance = current_distance
                optimal_path = current_path
            continue

        last_place_index = current_path[-1]
        for next_place_index in range(num_places):
            if next_place_index not in current_path:
                new_path = current_path + [next_place_index]
                new_distance = current_distance + place_distance_matrix[last_place_index][next_place_index]
                estimated_distance = new_distance + min(
                    [place_distance_matrix[next_place_index][i] for i in range(num_places) if i not in new_path] + [0]
                )
                heapq.heappush(path_queue, (estimated_distance, new_distance, new_path))

    if not optimal_path:
        print("A* failed to find a valid path.")
    return [place_names[i] for i in optimal_path], min_total_distance

def tsp_shortest_path(place_names):
    """
    Compute the shortest circular path visiting all places using brute force (TSP).
    """
    place_coordinates = get_coordinate(place_names)
    if not place_coordinates:
        print("No valid coordinates found.")
        return None, float("inf")

    place_distance_matrix = get_distance_matrix(place_coordinates)
    num_places = len(place_distance_matrix)
    optimal_path = None
    min_total_cost = float("inf")

    for permutation in itertools.permutations(range(1, num_places)):
        current_path = [0] + list(permutation) + [0]
        current_cost = sum(place_distance_matrix[current_path[i]][current_path[i + 1]] for i in range(len(current_path) - 1))
        if current_cost < min_total_cost:
            min_total_cost = current_cost
            optimal_path = current_path

    return [place_names[i] for i in optimal_path], min_total_cost

# Example usage
if __name__ == "__main__":
    test_places = ["꽁뚜식당", "바다횟집", "장승마을", "부추해물칼국수"]
    astar_path, astar_distance = astar_shortest_path(test_places)
    print("A* Shortest Path:", astar_path)
    print("A* Total Distance:", astar_distance)

    tsp_path, tsp_distance = tsp_shortest_path(test_places)
    print("TSP Shortest Circular Path:", tsp_path)
    print("TSP Total Distance:", tsp_distance)
