import requests

def get_waypoints(place_names):
    location_waypoints = []
    for place_name in place_names:
        kakao_search_url = 'https://dapi.kakao.com/v2/local/search/keyword.json?query={}'.format(place_name)
        kakao_headers = {
            "Authorization": "KakaoAK 27e3e2bffed2464908e54ca9b2062cd9"
        }
        try:
            place_info = requests.get(kakao_search_url, headers=kakao_headers).json()['documents'][0]
            location_waypoints.append({'longitude': place_info['x'], 'latitude': place_info['y']})
        except IndexError:
            print(f"No result found for {place_name}")
        except Exception as e:
            print(f"Error occurred: {e}")
    return location_waypoints

def get_route(location_waypoints):
    TMAP_API_KEY = "4zEO17lmTn1GfYU4fKQV60ml2mfXu806LyXmGhW1"
    TMAP_ROUTE_URL = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json"

    if location_waypoints and len(location_waypoints) >= 2:
        tmap_headers = {
            "Content-Type": "application/json",
            "appKey": TMAP_API_KEY
        }

        route_payload = {
            "startX": location_waypoints[0]['longitude'],
            "startY": location_waypoints[0]['latitude'],
            "endX": location_waypoints[-1]['longitude'],
            "endY": location_waypoints[-1]['latitude'],
            "passList": "_".join([f"{p['longitude']},{p['latitude']}" for p in location_waypoints[1:-1]]) if len(location_waypoints) > 2 else "",
            "reqCoordType": "WGS84GEO",
            "resCoordType": "WGS84GEO",
            "searchOption": 0,
            "trafficInfo": "Y",
            "startName": "출발지",
            "endName": "도착지"
        }
        
        route_response = requests.post(TMAP_ROUTE_URL, json=route_payload, headers=tmap_headers)
        
        if route_response.status_code == 200:
            return route_response.json()
        else:
            print(f"Error {route_response.status_code}: {route_response.text}")
            return None
    else:
        print("Not enough waypoints to calculate a route.")
        return None
