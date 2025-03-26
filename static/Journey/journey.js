function initMap() {
    // Default center point
    const center = { lat: 36.3504119, lng: 127.3845475 };
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: center,
        zoomControl: false, // 확대/축소 버튼 비활성화
        streetViewControl: false, // 거리 뷰 아이콘 비활성화
        mapTypeControl: false, // 지도 유형 선택 비활성화
        fullscreenControl: false
    });

    // Route data from Flask (replace with your dynamic data)
    const routePoints = JSON.parse(route_points);
    console.log(routePoints)

    // Convert to Google Maps-compatible LatLng objects
    const formattedRoutePoints = routePoints.map(point => ({
        lat: point.lat,
        lng: point.lng,
    }));

    const routePath = new google.maps.Polyline({
        path: formattedRoutePoints,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 3,
    });

    routePath.setMap(map);

    // Adjust map bounds to fit route
    const bounds = new google.maps.LatLngBounds();
    formattedRoutePoints.forEach(point => bounds.extend(point));
    map.fitBounds(bounds);
}