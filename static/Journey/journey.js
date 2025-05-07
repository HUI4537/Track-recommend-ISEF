// 현재 읽고 있는 TTS utterance
let ttsCurrentUtterance = null;
// 한 번 읽은 장소를 추적
const ttsSpokenPlaces = new Set();

// TTS 자동 팝업용 InfoWindow 

// ▶︎ 추가: TTS 활성화 상태와 파란 마커 리스트
let ttsEnabled = false;
const placeMarkersTTS = [];


/**
 * 효과음 재생 → 안내 멘트 → TTS 읽기
 * @param {string} name 장소 이름
 * @param {string} text 설명 텍스트
 */
function speakText(name, text) {
    // 1) 효과음 재생
    const sound = new Audio('/static/sounds/alert.mp3');
    sound.play();

    // 2) 효과음 끝난 뒤에 안내 멘트 + 설명 읽기
    sound.onended = () => {
        const fullText = `${name}에 대한 설명을 시작합니다. ${text}`;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(fullText);
        utt.lang = 'ko-KR';
        window.speechSynthesis.speak(utt);
        ttsCurrentUtterance = utt;
    };
}



// TTS 작업 큐
const ttsQueue = [];

// 큐에서 하나 꺼내 InfoWindow + TTS 실행
function processNextTTS() {
    if (ttsQueue.length === 0) return;
    const { marker, info } = ttsQueue.shift();

    // InfoWindow 열기
    const content = `
        <div class="info-window-content">
        <img src="${info.img||''}" alt="${info.name}">
        <h3>${info.name}</h3>
        <p>${info.explanation}</p>
        </div>`;
    t_infoWindow.setContent(content);
    t_infoWindow.open(marker.getMap(), marker);

    // 효과음 + 안내 + 설명 읽기
    const sound = new Audio('/static/sounds/alert.mp3');
    sound.play();
    sound.onended = () => {
        const fullText = `${info.name}에 대한 설명을 시작합니다. ${info.explanation}`;
        const utt = new SpeechSynthesisUtterance(fullText);
        utt.lang = 'ko-KR';
        utt.onend = () => processNextTTS();        // 다음 아이템 처리
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utt);
        ttsCurrentUtterance = utt;
    };
}


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


    const t_infoWindow = new google.maps.InfoWindow();

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

        // 마커 정보 TTS 배열에 추가
        placeMarkersTTS.push({ marker, info: place });


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

    // InfoWindow 닫기 버튼(X) 클릭 시 음성 중단
    t_infoWindow.addListener('closeclick', () => {
        if (ttsCurrentUtterance) {
        window.speechSynthesis.cancel();
        ttsCurrentUtterance = null;
        }
    });
    //TTS 비활성화를 위한 기능
    t_infoWindow.addListener('closeclick', () => {
        // InfoWindow 닫힐 때 TTS 중지
        if (ttsCurrentUtterance) {
            window.speechSynthesis.cancel();
            ttsCurrentUtterance = null;
        }
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

            //user 마커
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
            
            // 정확도 원
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

            // 가운데 정렬
            if (isDirectionTracking && !isDragging) {
                map.setCenter(latlng);
            }

            
            // --- 자동 팝업 & TTS ---
            if (ttsEnabled) {
                const userLatLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                const range = Math.max(50, pos.coords.accuracy);  // 50m 이상, 또는 정확도 반경

                placeMarkersTTS.forEach(({ marker, info }) => {
                    // 이미 읽은 장소 스킵
                    if (ttsSpokenPlaces.has(info.name)) return;

                    const dist = google.maps.geometry.spherical.computeDistanceBetween(
                        userLatLng,
                        marker.getPosition()
                    );

                    if (dist <= range) {
                        // 1) InfoWindow 열기
                        const content = `
                        <div class="info-window-content">
                            <img src="${info.img || ''}" alt="${info.name}">
                            <h3>${info.name}</h3>
                            <p>${info.explanation}</p>
                        </div>`;
                        t_infoWindow.setContent(content);
                        t_infoWindow.open(map, marker);

                        // 2) TTS 읽기
                        speakText(info.name, info.explanation);

                        ttsSpokenPlaces.add(info.name);
                    }
                });
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

    selectedLang = "KOR";

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

            // 이미 읽은 장소 목록 초기화
            ttsSpokenPlaces.clear();
        } else {
            ttsEnabled = true;
            selectedLang = lang;
            ttsToggleButton.textContent = `TTS 활성화 (${lang})`;
            ttsToggleButton.style.backgroundColor = '#34A853';  // 활성 색상

            ttsSpokenPlaces.clear();  // 활성화 시 읽은 장소 목록 초기화
        }

        ttsModal.style.display = 'none';

        // 이후 실제 TTS 로직과 연동할 때 ttsEnabled와 lang 변수를 사용하세요
    });
});