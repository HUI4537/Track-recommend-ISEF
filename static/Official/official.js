document.addEventListener('DOMContentLoaded', () => {
    const routes = {
        '한밭수목원 ~ 동물원 ~ 금동고개길(17km)': {
            waypoints: ['한밭수목원', '평송수련원', '유동천 하상도로', '복수교', '대전 오월드', '금동고개'],
            image: 'https://mblogthumb-phinf.pstatic.net/MjAyNDAyMTlfMjMy/MDAxNzA4MzAwNDg4NjU5.7u7qWQ_g0Fd4de4ja_3cq2F9Hei-bZu_gbKvZXx3MXQg.ibObW-iTpLfowJ3Db0uT9RgkMGO9lQuG06sUq921ZGAg.JPEG.zigzag0958/KakaoTalk_20240219_075514738_24.jpg?type=w800'
        },
        '한밭수목원 ~ 월드컵경기장 ~ 동학사(17km)': {
            waypoints: ['동학사', '현충원', '대전 월트컵 경기장', '충남대', '갑천대교', '예술의 전당', '한밭 수목원'],
            image: 'https://www.gongju.go.kr/thumbnail/tursmCn/920_TUCN_202004140126083030.JPG'
        },
        '한밭수목원 ~ 대청댐가는길(18km)': {
            waypoints: ['한밭수목원', '엑스포다리 건너 하상도로 진입', '갑천 하상도로(전민동 방면)', '원천교 하상도로', '대전 정수장', '전민동 엑스포 아파트', '구즉 묵마을 입구', '구즉 신구교다리 건너', '한국타이어', '신탄진', '대청댐'],
            image: 'https://i.namu.wiki/i/oK_s4ewfpN3ZR5radjgMoCQ8XOrzXzQzG5XWqwTZCIoo5lgEXdddLjlgzyo5KaFOdXzKs0RO8DdSXZcYz6IUdA.webp'
        },
        '한밭수목원 ~ 침산동뿌리공원(11km)': {
            waypoints: ['한밭수목원', '평송수련원', '유등천 하상도로', '유등교', '복수교', '안영동 농협마트', '안영교', '뿌리공원'],
            image: 'https://mblogthumb-phinf.pstatic.net/MjAyMzA0MjNfMjcg/MDAxNjgyMjYwNzU1Mjkx.cZo470Oe9IBRPtElIhRZoxgdjmK298vqDQZKGg3gH8sg.ZTt39ldsGBERlAvHtn6-O6bDrq_2lCM7-luSKFxcYVAg.JPEG.shesaidso/IMG_2359.jpg?type=w800'
        },
        '대청호 자연 생태 자전거길_연인길 (5.8km)': {
            waypoint: ['대전역', '신흥역', '판암역', '국화 꽃단지', '대청호반 자연생태공원', '대청호 자연생태관'],
            image: 'https://img.khan.co.kr/news/2022/10/24/news-p.v1.20221024.7c8c3a40b4374d3c82018b5b36271c8d.jpg'
        },
        '보문산의 자전거 길_건강길(10km)': {
            waypoint: ['보문산입구', '청년의 광장', '사정공원', '대전오월드', '뿌리공원'],
            image: 'https://i.namu.wiki/i/cx6Xbs5S1ehXcKCICno5p8yRkbOXedb7U-QqUrbN4QKgBh6x7hfEDbr6cMe3sevpRsZ30bjhbXgXmhdpvwEhHw.jpg'
        },
        '로하스(신탄길) 자전거길_관광길(7km)': {
            waypoint: ['신탄진역', '현도교', '대청대교', '레포츠센터', '미호교', '대청공원'],
            image: 'https://mblogthumb-phinf.pstatic.net/MjAxODA0MDNfMjE4/MDAxNTIyNzMyMjQ1NTIy.7KhqXcAc_1Gk8-ZyZCqVOjXogS0x5FhrkmI6V7836H8g.eqyEUrosntEzLjvssZMXh3VtpALgwuJXxJ0o8JJKUpAg.JPEG.daejeondime/image_1814416881522732198263.jpg?type=w800'
        }
    };

    const routesContainer = document.getElementById('routesContainer');
    const saveBtn = document.getElementById('saveBtn');
    let selectedRoute = null;

    // 경로 박스 생성
    console.log("Routes data:", routes); // Check if the routes object is correct
    for (const [routeName, { waypoints, image }] of Object.entries(routes)) {
        console.log(`Creating route box for: ${routeName}`); // Debugging each route
        
        const routeBox = document.createElement('div');
        routeBox.classList.add('route-box');

        const img = document.createElement('img');
        img.src = image;
        img.alt = routeName;

        const routeInfo = document.createElement('div');
        routeInfo.classList.add('route-info');

        const title = document.createElement('h3');
        title.textContent = routeName;

        const description = document.createElement('p');
        description.textContent = `${waypoints.length} 경유지`;

        routeInfo.appendChild(title);
        routeInfo.appendChild(description);
        routeBox.appendChild(img);
        routeBox.appendChild(routeInfo);

        // 경로 선택 시 스타일 적용
        routeBox.addEventListener('click', () => {
            selectedRoute = { routeName, waypoints };
            document.querySelectorAll('.route-box').forEach(box => box.classList.remove('selected'));
            routeBox.classList.add('selected');
        });

        routesContainer.appendChild(routeBox);
    }

    // 선택 완료 버튼 클릭 시
    let savedRoute = null;

    saveBtn.addEventListener('click', () => {
        if (selectedRoute) {
            savedRoute = selectedRoute;  // 선택된 경로를 변수에 저장
            console.log('저장된 경로:', savedRoute);  // 콘솔에 저장된 경로를 출력
        } else {
            console.log('경로를 선택해주세요.');
        }
    });
});
