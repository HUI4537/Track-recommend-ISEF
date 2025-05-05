
document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('.header');
    const sidebar = document.getElementById('sidebar'); // 사이드바
    const hamburgerMenu = document.getElementById('hamburger-menu');

    const heroImage = document.querySelector('.hero-image'); //메인 배경

    const searchContainer = document.querySelector('.search_container');
    const cardsContainer = document.querySelector('.cards_container');


    
    // 햄버거 메뉴 토글
    hamburgerMenu.addEventListener('click', function() {
    sidebar.classList.toggle('show');
    });
    
    // 스크롤 이벤트
    window.addEventListener('scroll', function() {
    // 헤더 배경 변경
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    // 히어로 이미지 패럴랙스 및 페이드 효과
    const scrollPosition = window.scrollY;
    const opacity = Math.max(1 - scrollPosition / 700, 0);
    const translateY = scrollPosition * 0.3;
    
    heroImage.style.opacity = opacity;
    heroImage.style.transform = `translateY(${translateY}px)`;
    });
    
    // 자동 슬라이드 이미지
    const sliderContainer = document.querySelector('.slider-container');
    const slides = document.querySelectorAll('.slide');
    let currentSlide = 0;
    
    function moveSlides() {
    if (currentSlide === slides.length - 1) {
        currentSlide = 0;
    } else {
        currentSlide++;
    }
    sliderContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    
    // 3초마다 슬라이드 변경
    setInterval(moveSlides, 3000);
    
    // 뉴스 카드 스와이프 기능
    const newsCards = document.querySelector('.news-cards');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const cardWidth = newsCards.querySelector('.news-card').offsetWidth;
    let scrollAmount = 0;
    
    prevBtn.addEventListener('click', function() {
    scrollAmount = Math.max(scrollAmount - cardWidth - 15, 0);
    newsCards.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
    });
    });
    
    nextBtn.addEventListener('click', function() {
    const maxScroll = newsCards.scrollWidth - newsCards.clientWidth;
    scrollAmount = Math.min(scrollAmount + cardWidth + 15, maxScroll);
    newsCards.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
    });
    });
    
    // 기존 main.js 기능 통합
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
        document.querySelectorAll(".cards_container .card").forEach((card) => {
        card.addEventListener("click", () => {
            const regionName = card.querySelector(".blog_title").textContent;
            displayRegion(regionName, data[regionName]);
        });
        });
    }
    });

});

//홈 이미지
document.addEventListener('DOMContentLoaded', function () {
const heroImage = document.querySelector('.hero-image');
const heroImageInner = document.createElement('div');
heroImageInner.classList.add('hero-image-inner');
heroImage.appendChild(heroImageInner);

const heroImages = [
    '/picture/Main.jpg',
    '/picture/대전.jpg',
    '/picture/서울.jpg'
];
let heroIndex = 0;
let isTransitioning = false;

function changeHeroImage() {
    if (isTransitioning) return;
    isTransitioning = true;

    heroImageInner.classList.add('fade-out');

    setTimeout(() => {
    heroIndex = (heroIndex + 1) % heroImages.length;
    heroImageInner.style.backgroundImage = `url('${heroImages[heroIndex]}')`;
    heroImageInner.classList.remove('fade-out');
    heroImageInner.classList.add('fade-in');

    setTimeout(() => {
        heroImageInner.classList.remove('fade-in');
        isTransitioning = false;
    }, 500);
    }, 500);
}

// 초기 이미지 설정
heroImageInner.style.backgroundImage = `url('${heroImages[0]}')`;

// 배경 변경 반복
setInterval(changeHeroImage, 7000);

// 패럴랙스 효과
window.addEventListener('scroll', function () {
    const scrollY = window.scrollY;
    const translateY = scrollY * 0.3;
    heroImage.style.transform = `translateY(${translateY}px)`;
});
});
