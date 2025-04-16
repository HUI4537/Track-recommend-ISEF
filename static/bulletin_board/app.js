// DOM 요소
const mainContent = document.getElementById('main-content');
const writeButton = document.getElementById('writeButton');
const imageInput = document.getElementById('imageInput');
let submitButton;

// 초기 로드
loadPostList();

// 게시글 목록 로드 함수
async function loadPostList() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        
        mainContent.innerHTML = `
            <div class="post-list">
                ${posts.length === 0 ? `
                    <div class="empty-state">
                        아직 하나도 글이 없네요, 첫번째로 글을 작성해볼까요?
                    </div>
                ` : posts.map(post => `
                    <div class="post-item" onclick="viewPost(${post.id})">
                        <img src="${post.thumbnail || 'default-thumbnail.jpg'}" 
                             alt="썸네일 이미지" 
                             class="post-thumbnail">
                        <div class="post-info">
                            <div class="post-author">
                                <img src="../../static/bulletin_board/profile.jpg" alt="프로필" class="author-profile">
                                <span>Example user</span>
                            </div>
                            <div class="post-title">${post.title}</div>
                            <div class="post-stats">
                                Comment ${post.comment_count} · Like ${post.likes}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // 작성하기 버튼 다시 표시
        showButton();
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}


// 게시글 상세 페이지로 이동
function viewPost(postId) {
    window.location.href = `/post/${postId}`;
}
// 글 작성하기 버튼 이벤트
writeButton.addEventListener('click', () => {
    mainContent.innerHTML = `
        <div class="write-form">
            <!-- 뒤로 가기 버튼 -->
            <button type="button" class="back-button" onclick="handleBack()">←</button>
            <h2>Creating a Post</h2>
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" class="form-input" id="titleInput" placeholder="제목을 입력하세요">
            </div>
            
            <div class="form-group">
                <label class="form-label">Picture</label>
                <div class="image-upload">
                    <div class="image-upload-items" id="imagePreviewContainer">
                        <button type="button" class="image-upload-button" onclick="imageInput.click()">
                            <span>+</span>
                        </button>
                    </div>
                </div>
                <small style="color: var(--text-gray)">Up to 6 photos can be uploaded</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Path Code</label>
                <input type="text" class="form-input" id="routeInput" placeholder="Please enter the path code">
            </div>
            
            <div class="form-group">
                <label class="form-label">Context</label>
                <textarea class="form-input" id="contentInput" rows="10" placeholder="Please enter the contents"></textarea>
            </div>
            
            <button type="button" class="submit-button" id="submit_button" onclick="submitPost()">Upload</button>
        </div>
    `;
    
    // 작성하기 버튼 숨김
    hideButton();
});

// 뒤로 가기 버튼 처리
function handleBack() {
    loadPostList();  // 게시글 목록 로드
    showButton();    // 작성하기 버튼 다시 표시
}

// 좋아요 처리 함수
async function handleLike(postId, element) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('좋아요 처리 실패');

        const result = await response.json();
        if (result.success) {
            // 좋아요 수 업데이트
            const likesCountElement = element.nextElementSibling;
            likesCountElement.textContent = result.likes;

            // 하트 색상 변경
            element.style.fill = '#F0A202';
        }
    } catch (error) {
        console.error('Error handling like:', error);
        alert('좋아요 처리 중 오류가 발생했습니다.');
    }
}
// 이미지 업로드 처리
let uploadedImages = [];

imageInput.addEventListener('change', async (e) => {
    if (uploadedImages.length >= 6) {
        alert('최대 6장까지만 업로드할 수 있습니다.');
        return;
    }
    
    const files = e.target.files;
    const container = document.getElementById('imagePreviewContainer');
    
    for (let file of files) {
        if (uploadedImages.length >= 6) break;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImages.push(e.target.result);
            updateImagePreviews();
        };
        reader.readAsDataURL(file);
    }
});

function updateImagePreviews() {
    const container = document.getElementById('imagePreviewContainer');
    
    container.innerHTML = uploadedImages.map(image => `
        <img src="${image}" alt="" class="image-preview">
    `).join('');
    
    if (uploadedImages.length < 6) {
        container.innerHTML += `
            <button type="button" class="image-upload-button" onclick="imageInput.click()">
                <span>+</span>
            </button>
        `;
    }
}
// 게시글 작성 제출
async function submitPost() {
    const title = document.getElementById('titleInput').value;
    const routeCode = document.getElementById('routeInput').value;
    const content = document.getElementById('contentInput').value;
    
    if (!title || !content || uploadedImages.length === 0) {
        alert('제목, 내용, 사진은 필수입니다.');
        return;
    }
    
    // 업로드 버튼 비활성화
    const submitButton = document.getElementById('submit_button');
    submitButton.disabled = true;
    submitButton.textContent = '업로드 중...';
    
    try {
        // 요청 시도 전 콘솔에 데이터 출력
        const postData = {
            title,
            content,
            route_code: routeCode,
            images: uploadedImages,
            user_id: 1
        };
        console.log('Sending data:', postData);
        
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Server response:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Response data:', result);
        
        if (result.success) {
            alert('게시글이 작성되었습니다.');
            loadPostList();
            showButton();
            uploadedImages = [];
        } else {
            throw new Error(result.error || '게시글 작성에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error submitting post:', error);
        alert(`게시글 작성 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        // 업로드 버튼 상태 복구
        submitButton.disabled = false;
        submitButton.textContent = '업로드하기';
    }
}

// 이미지 미리보기 업데이트 함수 수정
function updateImagePreviews() {
    const container = document.getElementById('imagePreviewContainer');
    if (!container) {
        console.error('Image preview container not found');
        return;
    }
    
    let previewHtml = uploadedImages.map((image, index) => `
        <div class="image-preview-wrapper">
            <img src="${image}" alt="Preview ${index + 1}" class="image-preview">
            <button type="button" class="remove-image" onclick="removeImage(${index})">×</button>
        </div>
    `).join('');
    
    if (uploadedImages.length < 6) {
        previewHtml += `
            <button type="button" class="image-upload-button" onclick="imageInput.click()">
                <span>+</span>
            </button>
        `;
    }
    
    container.innerHTML = previewHtml;
}

// 이미지 제거 함수 추가
function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreviews();
}
// 첫 번째 버튼을 숨기는 함수
function hideButton() {
    writeButton.style.display = "none";
}

// 첫 번째 버튼을 보이게 하는 함수
function showButton() {
    writeButton.style.display = "block";
}

//햄버거
document.addEventListener("DOMContentLoaded", function() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidebar = document.getElementById('sidebar');

    // Toggle sidebar when clicking on the hamburger menu
    hamburgerMenu.addEventListener('click', function(event) {
        event.stopPropagation();
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside of it
    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickInsideMenu = hamburgerMenu.contains(event.target);
        
        if (!isClickInsideSidebar && !isClickInsideMenu) {
            sidebar.classList.remove('active');
        }
    });
});