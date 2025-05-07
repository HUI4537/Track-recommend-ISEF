
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

// ---------- 마커 및 정보 박스 생성 ----------
    // 마커 및 정보 박스 생성
    const infoWindow = new google.maps.InfoWindow();

    // 자동 오픈을 한 번만 수행할 대상을 추적
    const openedOnce = new Set();

    // 마커와 place 정보를 담을 배열
    const placeMarkers = [];
    
      // 2) 각 장소에 마커 추가 및 클릭 토글
    const places = window.places || [];
    places.forEach(place => {

    // 디버깅: 실제 넘어오는 데이터 확인
    console.log("Place 객체:", place);

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
        // 같은 마커 클릭 시 닫기
        if (infoWindow.getAnchor() === marker) {
        infoWindow.close();
        return;
        }

      // InfoWindow 콘텐츠 조립
        const content = `
            <div class="info-window-content">
            <img src="${place.img || ''}" alt="${place.name}">
            <h3>${place.name || '이름 없음'}</h3>
            <p><strong>주소:</strong> ${place.address || '정보 없음'}</p>
            <p><strong>평점:</strong> ${place.rate || '정보 없음'}</p>
            <p><strong>영업시간:</strong> ${place.operation || '정보 없음'}</p>
            <p><strong>타입:</strong> ${place.type || '정보 없음'}</p>
            ${ place.homepage
                ? `<a href="${place.homepage}" target="_blank">홈페이지</a>`
                : ''
            }
            </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
        });
    });
    
      // -------- TTS 마커 생성하기 --------
    fetch('/locations')
    .then(res => res.json())
    .then(places => {
        console.log(places); // 디버깅: 실제 넘어오는 데이터 확인
    const t_infoWindow = new google.maps.InfoWindow();

    // 2) 각 장소에 작은 옅은 파란색 원형 마커 찍기
    places.forEach(place => {
        const customIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,               // 이전보다 크게
            fillColor: "#3fc1eb",    // 연한 파랑
            fillOpacity: 1.0,        // 완전 불투명
            strokeColor: "#FFFFFF",
            strokeOpacity: 1.0,      // 테두리 불투명
            strokeWeight: 2,
            anchor: new google.maps.Point(0, 0) // center at LatLng
        };
    
        const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        title: place.name,
        icon: customIcon
        });
    
        // 디버깅: 실제 아이콘 프로퍼티 확인
        console.log("Marker icon:", marker.getIcon());
        
        // 아래는 기본 마커
        // const marker = new google.maps.Marker({
        //     position: { lat: place.lat, lng: place.lng },
        //     map,
        //     title: place.name
        //     });   

        // 3) 클릭 시 InfoWindow에 이미지·타입·주소 표시
        marker.addListener('click', () => {
        const content = `
            <div class="info-window-content">
            <img src="${place.img || ''}" alt="${place.name}">
            <h3>${place.name}</h3>
            <p><strong>Type:</strong> ${place.type}</p>
            <p><strong>Address:</strong> ${place.address}</p>
            </div>`;
        t_infoWindow.setContent(content);
        t_infoWindow.open(map, marker);
        });
    });

    // 지도 클릭 시 InfoWindow 닫기
    map.addListener('click', () => t_infoWindow.close());
    })
    .catch(err => console.error('locations fetch error:', err));



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

// initMap 함수 아래, 또는 파일 하단에 추가
document.addEventListener('DOMContentLoaded', () => {
    let ttsEnabled = false;

    let selectedLang = "KOR";

    const ttsToggleButton    = document.getElementById('ttsToggleButton');
    const ttsModal           = document.getElementById('ttsModal');
    const ttsModalClose      = document.getElementById('ttsModalClose');
    const ttsActivateButton  = document.getElementById('ttsActivateButton');

    // 1) 버튼 클릭 시 모달 열기
    ttsToggleButton.addEventListener('click', () => {
        ttsModal.style.display = 'block';
    });

    // 2) 닫기 아이콘 또는 모달 외곽 클릭 시 모달 닫기
    ttsModalClose.addEventListener('click', () => {
        ttsModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === ttsModal) ttsModal.style.display = 'none';
    });

    // 3) 활성화 버튼 클릭 시 TTS 상태 변경
    ttsActivateButton.addEventListener('click', () => {
        const lang = document.querySelector('input[name="ttsLang"]:checked').value;

        if (lang === "Deactive") {
            ttsEnabled = false;
            selectedLang = null;
            ttsToggleButton.textContent = `TTS 비활성화`;
            ttsToggleButton.style.backgroundColor = '#666';  // 중립 색상
        } else {
            ttsEnabled = true;
            selectedLang = lang;
            ttsToggleButton.textContent = `TTS 활성화 (${lang})`;
            ttsToggleButton.style.backgroundColor = '#34A853';  // 활성 색상
        }

        ttsModal.style.display = 'none';

        // 이후 실제 TTS 로직과 연동할 때 ttsEnabled와 lang 변수를 사용하세요
    });
});