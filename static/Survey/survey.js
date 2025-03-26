document.addEventListener('DOMContentLoaded', function() {
    // Toggle 'selected' class on options when clicked and display selection
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', function() {
            // Remove 'selected' class from all options in the same group
            this.parentElement.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
            // Add 'selected' class to the clicked option
            this.classList.add('selected');
            displaySelection();
        });
    });
});

// Display selected options
function displaySelection() {
    const ageGroup = document.querySelector('#age_range .option.selected')?.textContent || 'Not selected';
    const gender = document.querySelector('#gender .option.selected')?.textContent || 'Not selected';
    const nationality = document.querySelector('#nationality .option.selected')?.textContent || 'Not selected';
    const travelTaste = document.querySelector('#travel_pref .option.selected')?.textContent || 'Not selected';
    const foodTaste = document.querySelector('#food_pref .option.selected')?.textContent || 'Not selected';

    document.getElementById('display-selection').innerHTML = `
        <p>Age Group: ${ageGroup}</p>
        <p>Gender: ${gender}</p>
        <p>Nationality: ${nationality}</p>
        <p>Travel Taste: ${travelTaste}</p>
        <p>Food Taste: ${foodTaste}</p>
    `;
}

// Submit selected data
function submitData() {
    const ageGroupElem = document.querySelector('#age_range .option.selected');
    const genderElem = document.querySelector('#gender .option.selected');
    const nationalityElem = document.querySelector('#nationality .option.selected');

    const age_range = ageGroupElem ? ageGroupElem.getAttribute('data-value') : 'not_selected';
    const gender = genderElem ? genderElem.getAttribute('data-value') : 'not_selected';
    const nationality = nationalityElem ? nationalityElem.getAttribute('data-value') : 'not_selected';

    // 입력 필드에서 값을 가져옵니다.
    const travel_pref = document.getElementById('travel_pref').value || 'not_selected';
    const food_pref = document.getElementById('food_pref').value || 'not_selected';

    const trackType = document.querySelector('#track-type .option.selected')?.getAttribute('data-value') || 'not_selected';

    const queryParams = new URLSearchParams({
        age_range,
        gender,
        nationality,
        travel_pref,
        food_pref,
        start_date: startDate || 'not_selected',
        end_date: endDate || 'not_selected',
        track_type: trackType
    }).toString();

    window.location.href = `/Recommend?${queryParams}`;
}

document.addEventListener('DOMContentLoaded', function () {
    const questionBoxes = document.querySelectorAll('.question-box');
    let currentQuestion = 0;

    // 브라우저의 스크롤 위치 복원 비활성화
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    // 새로고침 시 강제로 맨 위로 스크롤
    window.scrollTo(0, 0);

    // 스크롤 잠금 함수
    function lockScroll() {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }

    // 스크롤 잠금 해제 함수
    function unlockScroll() {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
    }

    // 다음 질문으로 이동하는 함수
    function goToNextQuestion() {
        if (currentQuestion < questionBoxes.length - 1) {
            currentQuestion++;
            
            // 일시적으로 스크롤 잠금 해제
            unlockScroll();

            // 다음 질문으로 스크롤
            questionBoxes[currentQuestion].scrollIntoView({ behavior: 'smooth' });

            // 스크롤 완료 후 다시 잠금 (setTimeout 대신 이벤트 리스너로 정확히 타이밍 제어)
            setTimeout(lockScroll, 800); // 애니메이션 시간 이후 잠금
        } else {
            // 마지막 질문 이후 스크롤 잠금 해제
            unlockScroll();
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    }

    // 첫 번째 질문으로 이동 (시작 버튼 클릭 시)
    document.querySelector('#start_button').addEventListener('click', function () {
        unlockScroll();
        questionBoxes[currentQuestion].scrollIntoView({ behavior: 'smooth' });
        setTimeout(lockScroll, 800);
    });

    // 달력의 다음 버튼에 대한 이벤트 리스너 추가
    document.querySelector('.calendar-next-button').addEventListener('click', function() {
        // 다른 옵션들처럼 동작하도록 수정
        if (currentQuestion < questionBoxes.length - 1) {
            currentQuestion++;
            unlockScroll();
            questionBoxes[currentQuestion].scrollIntoView({ behavior: 'smooth' });
            setTimeout(lockScroll, 800);
        }
    });

    // 옵션 선택 시 다음 질문으로 이동 (기존 코드)
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', function () {
            this.parentElement.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            if (currentQuestion < questionBoxes.length - 1) {
                currentQuestion++;
                unlockScroll();
                questionBoxes[currentQuestion].scrollIntoView({ behavior: 'smooth' });
                setTimeout(lockScroll, 800);
            }
        });
    });

    // 텍스트 입력 필드에서 Enter 키가 눌렸을 때 다음 질문으로 이동
    document.querySelectorAll('.typing').forEach(input => {
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                goToNextQuestion();
            }
        });
    });

    // 트랙 타입 선택 이벤트 리스너
    document.querySelectorAll('#track-type .option').forEach(option => {
        option.addEventListener('click', function() {
            // 기존의 선택 처리 코드
            const options = this.parentElement.querySelectorAll('.option');
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            // 페이지 하단으로 부드럽게 스크롤
            unlockScroll();
            window.scrollTo({ 
                top: document.body.scrollHeight, 
                behavior: 'smooth' 
            });
        });
    });
});

// 캘린더 초기화
function initCalendar() {
    const calendar = document.getElementById('calendar');
    const daysInNovember = 30;
    const firstDay = new Date(2023, 10, 1).getDay();

    // 빈 칸 추가
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendar.appendChild(emptyDay);
    }

    // 날짜 추가
    for (let i = 1; i <= daysInNovember; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = i;
        dayElement.dataset.date = `2023-11-${String(i).padStart(2, '0')}`;
        calendar.appendChild(dayElement);
    }
}

let startDate = null;
let endDate = null;

// 날짜 선택 이벤트 처리
document.addEventListener('DOMContentLoaded', function() {
    initCalendar();

    document.getElementById('calendar').addEventListener('click', function(e) {
        if (!e.target.classList.contains('calendar-day') || e.target.classList.contains('empty') || e.target.classList.contains('header')) {
            return;
        }

        const clickedDate = new Date(e.target.dataset.date);

        if (!startDate || (startDate && endDate)) {
            // 새로운 선택 시작
            clearDateSelection();
            startDate = e.target.dataset.date;
            e.target.classList.add('start-date');
            document.getElementById('start-date').textContent = startDate;
            document.getElementById('end-date').textContent = '선택해주세요';
        } else {
            // 종료일 선택
            const start = new Date(startDate);
            if (clickedDate < start) {
                alert('종료일은 시작일 이후여야 합니다.');
                return;
            }

            endDate = e.target.dataset.date;
            e.target.classList.add('end-date');
            document.getElementById('end-date').textContent = endDate;

            // 시작일과 종료일 사이의 날짜들 선택
            const days = document.querySelectorAll('.calendar-day:not(.empty):not(.header)');
            days.forEach(day => {
                const currentDate = new Date(day.dataset.date);
                if (currentDate > start && currentDate < clickedDate) {
                    day.classList.add('selected');
                }
            });
        }
    });
});

function clearDateSelection() {
    startDate = null;
    endDate = null;
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('start-date', 'end-date', 'selected');
    });
}


