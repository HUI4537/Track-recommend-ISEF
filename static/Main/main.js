document.addEventListener("DOMContentLoaded", function () {
    const homeScreen = document.querySelector(".cards_container");
    const regionScreen = document.createElement("div");
    regionScreen.id = "regionScreen";
    regionScreen.style.display = "none";
    document.body.appendChild(regionScreen);

    // 지역 데이터 가져오기
    async function fetchRegionData() {
        try {
            const response = await fetch("/api/data");
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("데이터를 불러오는 데 실패했습니다:", error);
            return null;
        }
    }

    // 지역 상세 정보 표시
    function displayRegion(regionName, regionData) {
        if (!regionData) {
            alert("해당 지역에 대한 데이터가 없습니다.");
            return;
        }

        // 홈 화면 숨기고 지역 화면 표시
        homeScreen.style.display = "none";
        regionScreen.style.display = "block";

        // 지역 화면 초기화 및 내용 추가
        regionScreen.innerHTML = `
            <button id="homeButton" class="home-button">←</button>
            <h1>${regionName}</h1>
        `;

        // 지역 상세 정보 생성
        for (const [topic, details] of Object.entries(regionData)) {
            const topicElement = document.createElement("div");
            topicElement.classList.add("region-topic");
            topicElement.innerHTML = `
                <h2>${topic}</h2>
                <p>${details.description}</p>
                <img src="${details.image}" alt="${topic}" class="topic-image">
            `;
            regionScreen.appendChild(topicElement);
        }

        // 홈 버튼 이벤트 추가
        document.getElementById("homeButton").addEventListener("click", () => {
            homeScreen.style.display = "block";
            regionScreen.style.display = "none";
        });
    }

    // 데이터 가져오고 카드 클릭 이벤트 추가
    fetchRegionData().then((data) => {
        if (data) {
            document.querySelectorAll(".card").forEach((card) => {
                card.addEventListener("click", () => {
                    const regionName = card.querySelector(".blog_title").textContent;
                    displayRegion(regionName, data[regionName]);
                });
            });
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const header = document.querySelector(".header");
    const searchContainer = document.querySelector(".search_container");
    const cardsContainer = document.querySelector(".cards_container");

    const totalHeight = header.offsetHeight + searchContainer.offsetHeight;

    cardsContainer.style.marginTop = `${totalHeight+10}px`; 
});