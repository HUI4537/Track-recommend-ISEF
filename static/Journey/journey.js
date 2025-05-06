
function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 36.3504119, lng: 127.3845475 },
        zoom: 12,
        zoomControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
    });

    const routePoints = window.routePoints || [];
    const places = window.places || [];

    const formattedRoutePoints = routePoints.map(p => ({ lat: p.lat, lng: p.lng }));

    new google.maps.Polyline({
        path: formattedRoutePoints,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map
    });

    const bounds = new google.maps.LatLngBounds();
    formattedRoutePoints.forEach(p => bounds.extend(p));
    map.fitBounds(bounds);

    // 마커 및 정보 박스 생성
    places.forEach(place => {
        const infoBox = createPlaceInfoBox(place);
        createPlaceMarker(map, place, infoBox);
    });

    // 위치 추적 및 나침반 기능
    let isDirectionTracking = false;
    const directionButton = document.getElementById('directionButton');
    let userMarker = null;
    let accuracyCircle = null;
    let directionArrow = null;
    let isDragging = false;

    map.addListener('dragstart', () => isDragging = true);
    map.addListener('dragend', () => {
        isDragging = false;
        if (isDirectionTracking && userMarker) {
            map.setCenter(userMarker.getPosition());
        }
    });

    function createDirectionArrow(pos, heading) {
        const rad = heading * Math.PI / 180;
        const arrowLength = 50, arrowWidth = 20;
        const end = {
            lat: pos.lat + arrowLength * Math.cos(rad) / 111111,
            lng: pos.lng + arrowLength * Math.sin(rad) / (111111 * Math.cos(pos.lat * Math.PI / 180))
        };
        const left = {
            lat: pos.lat + arrowWidth * Math.cos(rad + Math.PI/2) / 111111,
            lng: pos.lng + arrowWidth * Math.sin(rad + Math.PI/2) / (111111 * Math.cos(pos.lat * Math.PI / 180))
        };
        const right = {
            lat: pos.lat + arrowWidth * Math.cos(rad - Math.PI/2) / 111111,
            lng: pos.lng + arrowWidth * Math.sin(rad - Math.PI/2) / (111111 * Math.cos(pos.lat * Math.PI / 180))
        };
        if (directionArrow) directionArrow.setMap(null);
        directionArrow = new google.maps.Polygon({
            paths: [end, left, pos, right, end],
            strokeColor: '#4285F4',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#4285F4',
            fillOpacity: 0.35,
            map: map
        });
    }

    function handleOrientation(e) {
        if (!isDirectionTracking) return;
        const heading = e.alpha || e.webkitCompassHeading || 0;
        map.setOptions({ heading, tilt: 45 });
        if (userMarker) {
            const pos = userMarker.getPosition();
            createDirectionArrow({ lat: pos.lat(), lng: pos.lng() }, heading);
        }
    }

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
            const latlng = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
            if (!userMarker) {
                userMarker = new google.maps.Marker({
                    position: latlng,
                    map,
                    title: "현재 위치",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "#fff"
                    }
                });
            } else {
                userMarker.setPosition(latlng);
            }

            if (!accuracyCircle) {
                accuracyCircle = new google.maps.Circle({
                    strokeColor: "#4285F4",
                    strokeOpacity: 0.2,
                    strokeWeight: 1,
                    fillColor: "#4285F4",
                    fillOpacity: 0.1,
                    center: latlng,
                    radius: pos.coords.accuracy,
                    map
                });
            } else {
                accuracyCircle.setCenter(latlng);
                accuracyCircle.setRadius(pos.coords.accuracy);
            }

            if (isDirectionTracking && !isDragging) {
                map.setCenter(latlng);
            }
        }, err => {
            console.warn("위치 접근 실패:", err);
        }, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        });
    }

    directionButton.addEventListener('click', () => {
        isDirectionTracking = !isDirectionTracking;
        directionButton.classList.toggle('active');
        if (isDirectionTracking) {
            if (window.DeviceOrientationEvent) {
                window.addEventListener('deviceorientation', handleOrientation);
                if (userMarker) map.setCenter(userMarker.getPosition());
            } else {
                alert("기기가 방향 센서를 지원하지 않습니다.");
                isDirectionTracking = false;
                directionButton.classList.remove('active');
            }
        } else {
            window.removeEventListener('deviceorientation', handleOrientation);
            map.setOptions({ heading: 0, tilt: 0 });
            if (directionArrow) {
                directionArrow.setMap(null);
                directionArrow = null;
            }
        }
    });
}

function createPlaceInfoBox(place) {
    const box = document.createElement('div');
    box.className = 'place-info-box';
    box.innerHTML = `<img src="${place.img}" alt="${place.name}">
                     <h3>${place.name}</h3>
                     <p>${place.address}</p>`;
    document.body.appendChild(box);
    return box;
}

function createPlaceMarker(map, place, box) {
    const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        title: place.name,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#FF0000",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#fff"
        }
    });

    marker.addListener('click', () => {
        box.style.display = 'block';
        box.style.left = '100px';
        box.style.top = '100px';
    });

    map.addListener('click', () => {
        box.style.display = 'none';
    });
}
