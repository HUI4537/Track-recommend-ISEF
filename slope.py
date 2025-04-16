import osmnx as ox
import networkx as nx
import numpy as np
import matplotlib.pyplot as plt
from osmnx import elevation

# 0. API 키 입력
api_key = "AIzaSyDkPWI-Lb7GbibqP7_PUkcICADaN3PFXU0"  # ← 본인의 Google API 키로 교체

# 1. 도로망 로드 (자전거 네트워크)
place = "Daejeon, South Korea"
G = ox.graph_from_place(place, network_type='walk')

# 2. 노드에 고도 정보 추가 (Google Elevation API 사용)
G = elevation.add_node_elevations_google(G, api_key=api_key)

# 3. 엣지에 경사도 정보 추가
G = elevation.add_edge_grades(G)

# 4. 경사도 기반 비용 slope_cost 계산
for u, v, k, data in G.edges(keys=True, data=True):
    length = data.get("length", 1)
    grade = data.get("grade", 0)

    # NaN 방지
    if length is None or np.isnan(length) or length <= 0:
        length = 1
    if grade is None or np.isnan(grade):
        grade = 0

    # 경사도 기반 가중치 계산
    # 오르막은 penalty_factor, 내리막은 bonus_factor
    penalty_factor = 30
    bonus_factor = 10

    if grade > 0:  # 오르막
        slope_cost = length * (1 + penalty_factor * grade)
    elif grade < 0:  # 내리막
        slope_cost = length * (1 - bonus_factor * abs(grade))
        slope_cost = max(slope_cost, 1)  # 너무 작아지지 않도록 최소값 설정
    else:
        slope_cost = length  # 평지

    data["slope_cost"] = slope_cost

# 5. 출발지 / 도착지 지정
start_point = (36.300865, 127.342517)
end_point = (36.309307, 127.380956)
orig_node = ox.distance.nearest_nodes(G, X=start_point[1], Y=start_point[0])
dest_node = ox.distance.nearest_nodes(G, X=end_point[1], Y=end_point[0])

# 6. 경사도 기반 최단 경로 탐색
if nx.has_path(G, orig_node, dest_node):
    route = nx.shortest_path(G, orig_node, dest_node, weight='slope_cost')
else:
    raise ValueError("출발지와 도착지가 연결되어 있지 않아요.")

# 7. 확대용 경계 계산
lats = [G.nodes[node]['y'] for node in route]
lngs = [G.nodes[node]['x'] for node in route]
margin = 0.005
west, east = min(lngs) - margin, max(lngs) + margin
south, north = min(lats) - margin, max(lats) + margin

# 8. 시각화
fig, ax = ox.plot_graph_route(
    G,
    route,
    route_linewidth=1,
    route_color='red',
    node_size=0,
    bgcolor='white',
    edge_color='gray',
    edge_linewidth=0.1,
    show=False,
    close=False,
)

ax.set_xlim(west, east)
ax.set_ylim(south, north)
ax.set_title("Slope-Aware Bicycle Route (Zoomed)", fontsize=12)
plt.show()
