function initMap() {
    // 기본 지도 중심 (대전 중심)
    const center = { lat: 36.3504119, lng: 127.3845475 };
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: center,
        zoomControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
    });

    // 사용자 마커 생성 및 지도에 추가
    const userMarker = new google.maps.Marker({
        position: center,
        map: map,
        draggable: true,
        title: "Your Location",
    });

    // 서버에서 위치 데이터를 가져오기 (시각화는 생략)
    fetch("/locations")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(locations => {
            // 데이터는 로드되지만 시각화는 생략
            console.log("Locations loaded:", locations);
        });

    // 사용자 마커 드래그 이벤트 처리
    google.maps.event.addListener(userMarker, "dragend", () => {
        const position = userMarker.getPosition();
        const lat = position.lat();
        const lng = position.lng();

        // 범위 확인 API 호출
        fetch("/check-range", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.in_range) {
                    // 범위 내일 경우 TTS 재생
                    fetch(`/tts/${encodeURIComponent(data.explanation)}`)
                        .then(() => {
                            const audio = new Audio("/static/tts.mp3");
                            audio.play();
                        });
                }
            });
    });
}
