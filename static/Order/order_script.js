let draggedItem = null;

        // Drag & Drop Event Listeners
        document.querySelectorAll('.place-box').forEach(box => {
            box.addEventListener('dragstart', function (event) {
                draggedItem = event.target;
                event.dataTransfer.effectAllowed = "move";
            });

            box.addEventListener('dragover', function (event) {
                event.preventDefault();
            });

            box.addEventListener('drop', function (event) {
                event.preventDefault();
                const list = document.getElementById("place-list");
                if (draggedItem !== event.target) {
                    list.insertBefore(draggedItem, event.target.nextSibling);
                }
            });

            // Touch support for drag
            box.addEventListener('touchstart', function (event) {
                draggedItem = event.target;
            });

            box.addEventListener('touchmove', function (event) {
                event.preventDefault();
                const touch = event.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (draggedItem && target && target.classList.contains('place-box') && draggedItem !== target) {
                    const list = document.getElementById("place-list");
                    list.insertBefore(draggedItem, target.nextSibling);
                }
            });

            box.addEventListener('touchend', function () {
                draggedItem = null;
            });
        });

// Save Order Button
document.getElementById('save-button').addEventListener('click', function () {
    const orderedPlaces = [];
    document.querySelectorAll('.place-box').forEach(item => {
        orderedPlaces.push(item.dataset.placeName);
    });

    // Extract start and end dates from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const startDate = urlParams.get('start_date');
    const endDate = urlParams.get('end_date');
    const trackType = urlParams.get('track_type');

    // Send data to the server
    fetch('/save_order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            orderedPlaces: orderedPlaces,
            startDate: startDate,
            endDate: endDate,
            trackType: trackType
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('트랙이 성공적으로 저장되었습니다.');
            window.location.href = '/Main';
        } else {
            alert(data.error || '트랙 저장에 실패했습니다.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('트랙 저장 중 오류가 발생했습니다.');
    });
});

// Initialize Drag & Drop Functionality
document.addEventListener('DOMContentLoaded', function() {
    const placeList = document.getElementById('place-list');

    // Drag start
    placeList.addEventListener('dragstart', function (e) {
        draggedItem = e.target;
        e.target.style.opacity = '0.5';
    });

    // Drag end
    placeList.addEventListener('dragend', function (e) {
        e.target.style.opacity = '1';
    });

    // Drag over
    placeList.addEventListener('dragover', function (e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(placeList, e.clientY);
        if (afterElement == null) {
            placeList.appendChild(draggedItem);
        } else {
            placeList.insertBefore(draggedItem, afterElement);
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.place-box:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
});
//이 아래가 최적 경로 계산
document.getElementById('ai-recommend-button').addEventListener('click', async function() {
    const button = this;
    const originalText = button.textContent;
    button.textContent = '실행중...';
    button.disabled = true;

    const placeBoxes = document.querySelectorAll('.place-box');
    const places = Array.from(placeBoxes).map(box => box.dataset.placeName);
    
    try {
        const response = await fetch('/optimize_route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                places: places,
                routeType: 'circular'
            })
        });

        const data = await response.json();
        
        // 데이터 유효성 검사 추가
        if (!data.optimized_route || !Array.isArray(data.optimized_route)) {
            throw new Error('최적 경로 데이터가 올바르지 않습니다.');
        }

        const optimizedPlaces = data.optimized_route;
        const placeList = document.getElementById('place-list');
        
        // 마지막 장소를 제외하고 순서 적용 (배열이 비어있지 않은 경우에만)
        if (optimizedPlaces.length > 0) {
            optimizedPlaces.slice(0, -1).forEach(placeName => {
                const placeBox = Array.from(placeBoxes).find(box => box.dataset.placeName === placeName);
                if (placeBox) {
                    placeList.appendChild(placeBox);
                }
            });
        }
    } catch (error) {
        console.error('최적 경로 계산 중 오류 발생:', error);
        alert('최적 경로 계산 중 오류가 발생했습니다: ' + error.message);
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
});
