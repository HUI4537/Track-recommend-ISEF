import requests

def get_waypoints(place_names):
    waypoints = []
    for place_name in place_names:
        url = 'https://dapi.kakao.com/v2/local/search/keyword.json?query={}'.format(place_name)
        headers = {
            "Authorization": "KakaoAK 27e3e2bffed2464908e54ca9b2062cd9"
        }
        try:
            info = requests.get(url, headers=headers).json()['documents'][0]
            waypoints.append({'lon': info['x'], 'lat': info['y']})
        except IndexError:
            print(f"No result found for {place_name}")
        except Exception as e:
            print(f"Error occurred: {e}")
    return waypoints

def get_route(waypoints):
    tmap_api_key = "4zEO17lmTn1GfYU4fKQV60ml2mfXu806LyXmGhW1"
    tmap_route_url = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json"

    if waypoints and len(waypoints) >= 2:

        headers = {
            "Content-Type": "application/json",
            "appKey": tmap_api_key
        }

        payload = {
            "startX": waypoints[0]['lon'],
            "startY": waypoints[0]['lat'],
            "endX": waypoints[-1]['lon'],
            "endY": waypoints[-1]['lat'],
            "passList": "_".join([f"{p['lon']},{p['lat']}" for p in waypoints[1:-1]]) if len(waypoints) > 2 else "",
            "reqCoordType": "WGS84GEO",
            "resCoordType": "WGS84GEO",
            "searchOption": 0,
            "trafficInfo": "Y",
            "startName": "출발지",
            "endName": "도착지"
        }
        
        response = requests.post(tmap_route_url, json=payload, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error {response.status_code}: {response.text}")
            return None
    else:
        print("Not enough waypoints to calculate a route.")
        return None
