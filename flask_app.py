from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory,send_file
import os
import sqlite3
import base64
import uuid
import pandas as pd
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
import hashlib
import os
import json
import re
from datetime import datetime, timedelta
#경로 가져오기
from place_recommender import PlaceRecommender
from route_finder import get_route, get_waypoints
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from schedule_maker import tsp_shortest_path, astar_shortest_path
import csv
# 현재 Python 파일의 디렉터리 기준으로 경로 설정
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
BULLETIN_BOARD_DATABASE = os.path.join(BASE_DIR, 'board.db')
BULLETIN_BOARD_UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')

app = Flask(__name__)
CORS(app)  # CORS 설정 추가

# 세션 설정
app.secret_key = app.secret_key or 'default_secret_key'
app.config['UPLOAD_FOLDER'] = BULLETIN_BOARD_UPLOAD_FOLDER


import sqlite3  # SQLite 모듈 추가

# SQLite 데이터베이스 파일 경로
LOGIN_DATABASE_FILE = os.path.join(os.path.dirname(__file__), "pythonlogin.db")
LOGIN_DATA_FILE = os.path.join(app.static_folder, "Main", "data.json")


#Restraunt CSV 최초로 불러오기
CSV_PATH = os.path.join(os.path.dirname(__file__), 'restaurant.csv')
RESTAURANT_DF = pd.read_csv(CSV_PATH, encoding='utf-8')



# ------------ TTS CSV 파일 최초 설정 --------------
# 1) CSV 파일 경로 설정
CSV_FILES = {
    'ko': os.path.join(BASE_DIR, 'places.csv'),
    'en': os.path.join(BASE_DIR, 'places_en.csv'),
    'ja': os.path.join(BASE_DIR, 'places_ja.csv'),
}

def load_places(csv_path):
    import csv
    from route_finder import get_waypoints

    # 1) CSV 파싱
    rows = []
    name_to_info = {}
    with open(csv_path, encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('Name', '').strip()
            address = row.get('Address', '').strip()
            info = {
                'name': name,
                'address': address,
                'operation': row.get('Operation', '').strip(),
                'type': row.get('Type', '').strip(),
                'explanation': row.get('Explanation', '').strip(),
                'img': row.get('Img', '').strip()
            }
            rows.append(info)
            name_to_info[name] = info

    # 2) 주소 기반으로 위경도 추출
    addresses = [row['address'] for row in rows]
    coords = get_waypoints(addresses)

    # 3) 주소와 위경도를 이름 기준으로 재결합
    places = []
    for info, coord in zip(rows, coords):
        if coord:  # 좌표가 정상적으로 계산된 경우에만 포함
            places.append({
                **info,
                'lat': float(coord['latitude']),
                'lng': float(coord['longitude']),
            })

    return places
# 서버 시작 시 한 번만 로드
LOCATIONS = {
    lang: load_places(path)
    for lang, path in CSV_FILES.items()
}

# ------------ TTS CSV 파일 최초 설정 end --------------

def get_logindb_connection():
    """SQLite 데이터베이스 연결 함수."""
    conn = sqlite3.connect(LOGIN_DATABASE_FILE)
    conn.row_factory = sqlite3.Row  # 딕셔너리처럼 결과를 반환하기 위해 추가
    return conn


def get_bulletin_board_db_connection():
    conn = sqlite3.connect(BULLETIN_BOARD_DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def load_data():
    if not os.path.exists(LOGIN_DATA_FILE):
        return {"error": "Data file not found"}
    try:
        with open(LOGIN_DATA_FILE, encoding="utf-8") as file:
            data = json.load(file)
            return data
    except json.JSONDecodeError:
        return {"error": "Invalid JSON format in data file"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}

@app.route("/")
def main():
    return render_template("Main.html")

@app.route("/Main")
def gomain():
    return render_template("Main.html")

@app.route("/Test")
def test():
    return render_template("Test.html")


@app.route("/api/data")
def api_data():
    data = load_data()
    if "error" in data:
        return jsonify(data), 500  # 오류가 발생하면 HTTP 500 반환
    return jsonify(data), 200  # 성공 시 HTTP 200 반환


@app.route('/picture/<path:filename>')
def picture(filename):
    return send_from_directory("picture", filename)

# 로그인 페이지
@app.route('/pythonlogin/', methods=['GET', 'POST'])
def login():
    msg = ''
    if request.method == 'POST' and 'username' in request.form and 'password' in request.form:
        username = request.form['username']
        password = request.form['password']
        hash = hashlib.sha1((password + app.secret_key).encode()).hexdigest()

        conn = get_logindb_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM accounts WHERE username = ? AND password = ?', (username, hash))
        account = cursor.fetchone()
        conn.close()

        if account:
            session['loggedin'] = True
            session['id'] = account['id']
            session['username'] = account['username']
            return redirect(url_for('gomain'))
        else:
            msg = 'Incorrect username/password!'
    return render_template('login.html', msg=msg)


# 로그아웃
@app.route('/pythonlogin/logout')
def logout():
    session.pop('loggedin', None)
    session.pop('id', None)
    session.pop('username', None)
    return redirect(url_for('gomain'))

# 회원가입 페이지
@app.route('/pythonlogin/register', methods=['GET', 'POST'])
def register():
    msg = ''
    if request.method == 'POST' and 'username' in request.form and 'password' in request.form and 'email' in request.form:
        username = request.form['username']
        password = request.form['password']
        email = request.form['email']

        conn = get_logindb_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM accounts WHERE username = ?', (username,))
        account = cursor.fetchone()

        if account:
            msg = 'Account already exists!'
        elif not re.match(r'[^@]+@[^@]+\.[^@]+', email):
            msg = 'Invalid email address!'
        elif not re.match(r'[A-Za-z0-9]+', username):
            msg = 'Username must contain only characters and numbers!'
        else:
            hash = hashlib.sha1((password + app.secret_key).encode()).hexdigest()
            cursor.execute('INSERT INTO accounts (username, password, email) VALUES (?, ?, ?)', (username, hash, email))
            conn.commit()
            msg = 'You have successfully registered!'
        conn.close()
    return render_template('register.html', msg=msg)

# 홈 페이지
@app.route('/pythonlogin/home')
def home():
    if 'loggedin' in session:
        return render_template('Main.html', username=session['username'], loggedin=True)
    return redirect(url_for('login'))

# 프로필 페이지
@app.route('/pythonlogin/profile')
def profile():
    if 'loggedin' not in session:
        return redirect(url_for('login'))
        
    conn = get_logindb_connection()
    cursor = conn.cursor()
    
    # 사용자 계정 정보 가져오기
    cursor.execute('SELECT * FROM accounts WHERE id = ?', (session['id'],))
    account = cursor.fetchone()
    
    # 사용자의 트랙 정보 가져오기
    cursor.execute('''
        SELECT id, created_at, track_places, start_date, end_date, track_type 
        FROM tracks 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ''', (session['id'],))
    
    tracks = []
    for track in cursor.fetchall():
        places = track[2].split(',')
        first_place = places[0] if places else None
        last_place = places[-1] if places else None
        
        tracks.append({
            'id': track[0],
            'created_at': track[1],
            'track_places': track[2],
            'start_date': track[3],
            'end_date': track[4],
            'track_type': track[5],

        })
    
    conn.close()
    return render_template('profile.html', account=account, tracks=tracks)


@app.context_processor
def inject_loggedin_status():
    return {'loggedin': 'loggedin' in session}

###
#여기 아래부터 게시판 관련 라우터
#---------------------------------------------------------------------------------
###

@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/post/<int:post_id>')
def post(post_id):
    return render_template('post.html')

# API 엔드포인트 - 게시글 목록 조회
@app.route('/api/posts', methods=['GET'])
def get_posts():
    conn = get_bulletin_board_db_connection()
    
    # posts와 images 테이블 조인 (각 post_id에 대해 첫 번째 이미지만 가져옴)
    query = """
        SELECT p.*, 
               (SELECT image_url 
                FROM images 
                WHERE images.post_id = p.id 
                ORDER BY id ASC 
                LIMIT 1) AS thumbnail
        FROM posts p
    """
    posts = conn.execute(query).fetchall()
    conn.close()
    
    # 데이터를 JSON 형태로 변환
    return jsonify([dict(post) for post in posts])


# API 엔드포인트 - 특정 게시글 조회
@app.route('/api/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    conn = get_bulletin_board_db_connection()
    post = conn.execute('SELECT * FROM posts WHERE id = ?', (post_id,)).fetchone()
    images = conn.execute('SELECT image_url FROM images WHERE post_id = ?', (post_id,)).fetchall()
    comments = conn.execute('SELECT * FROM comments WHERE post_id = ?', (post_id,)).fetchall()
    conn.close()

    if post is None:
        return jsonify({'error': 'Post not found'}), 404

    return jsonify({
        'post': dict(post),
        'images': [image['image_url'] for image in images],
        'comments': [dict(comment) for comment in comments]
    })

# API 엔드포인트 - 게시글 좋아요 증가
@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
def toggle_post_like(post_id):
    conn = get_bulletin_board_db_connection()
    cursor = conn.cursor()

    # 요청 데이터에서 좋아요 상태 받기
    data = request.get_json()
    is_liked = data.get('is_liked', True)

    # 좋아요 상태에 따라 증가/감소 처리
    if is_liked:
        cursor.execute('UPDATE posts SET likes = likes + 1 WHERE id = ?', (post_id,))
    else:
        cursor.execute('UPDATE posts SET likes = likes - 1 WHERE id = ?', (post_id,))

    conn.commit()

    # 변경된 좋아요 수 반환
    updated_likes = cursor.execute('SELECT likes FROM posts WHERE id = ?', (post_id,)).fetchone()
    conn.close()

    if updated_likes:
        return jsonify({'success': True, 'likes': updated_likes[0]})
    else:
        return jsonify({'success': False}), 404

#댓글달기
@app.route('/api/comments', methods=['POST'])
def add_comment():
    data = request.get_json()
    post_id = data.get('post_id')
    user_id = data.get('user_id')
    content = data.get('content')
    
    if not post_id or not user_id or not content:
        return jsonify({'error': 'Invalid data'}), 400
    
    conn = get_bulletin_board_db_connection()
    cursor = conn.cursor()
    
    # 댓글 추가
    cursor.execute(
        'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
        (post_id, user_id, content)
    )
    
    # 정확한 댓글 수 계산 및 업데이트
    cursor.execute(
        'SELECT COUNT(*) FROM comments WHERE post_id = ?',
        (post_id,)
    )
    comment_count = cursor.fetchone()[0]
    
    cursor.execute(
        'UPDATE posts SET comment_count = ? WHERE id = ?',
        (comment_count, post_id)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Comment added successfully'}), 201
@app.route('/api/comments/<int:comment_id>/like', methods=['POST'])
def toggle_comment_like(comment_id):
    conn = get_bulletin_board_db_connection()
    cursor = conn.cursor()

    # 요청 데이터에서 좋아요 상태 받기
    data = request.get_json()
    is_liked = data.get('is_liked', True)

    # 좋아요 상태에 따라 증가/감소 처리
    if is_liked:
        cursor.execute('UPDATE comments SET likes = likes + 1 WHERE id = ?', (comment_id,))
    else:
        cursor.execute('UPDATE comments SET likes = likes - 1 WHERE id = ?', (comment_id,))

    conn.commit()

    # 변경된 좋아요 수 반환
    updated_likes = cursor.execute('SELECT likes FROM comments WHERE id = ?', (comment_id,)).fetchone()
    conn.close()

    if updated_likes:
        return jsonify({'success': True, 'likes': updated_likes[0]})
    else:
        return jsonify({'success': False}), 404

#게시글 업로드
@app.route('/api/posts', methods=['POST'])
def create_post():
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400
            
        print("Received data:", data)  # 디버깅을 위한 데이터 출력
        
        required_fields = ['title', 'content', 'user_id']
        if not all(field in data for field in required_fields):
            return jsonify({'error': f'Missing required fields. Required: {required_fields}'}), 400
        
        conn = get_bulletin_board_db_connection()
        try:
            # 게시글 저장
            cursor = conn.execute(
                '''INSERT INTO posts (user_id, title, content, route_code)
                   VALUES (?, ?, ?, ?)''',
                (data['user_id'], 
                 data['title'], 
                 data['content'],
                 data.get('route_code', ''))
            )
            
            post_id = cursor.lastrowid
            
            # 이미지 처리
            if 'images' in data and data['images']:
                for image_data in data['images']:
                    if image_data:
                        try:
                            # Base64 이미지 데이터 저장
                            image_url = save_base64_image(image_data, post_id)
                            if image_url:
                                conn.execute(
                                    'INSERT INTO images (post_id, image_url) VALUES (?, ?)',
                                    (post_id, image_url)
                                )
                        except Exception as e:
                            print(f"Error saving image: {e}")
                            continue
            
            conn.commit()
            return jsonify({'success': True, 'post_id': post_id})
            
        except Exception as e:
            conn.rollback()
            print(f"Database error: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({'error': str(e)}), 500

def save_base64_image(base64_string, post_id):
    try:
        # base64 헤더 제거
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
            
        # base64 디코드
        image_data = base64.b64decode(base64_string)
        
        # 파일명 생성
        filename = f"post_{post_id}_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # 이미지 저장
        with open(filepath, 'wb') as f:
            f.write(image_data)
            
        return f'/static/uploads/{filename}'
    except Exception as e:
        print(f"Error in save_base64_image: {e}")
        return None

# 데이터베이스 초기화 함수
def setup_database():
    conn = get_logindb_connection()
    cursor = conn.cursor()
    
    # accounts 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE
        )
    ''')
    
    # tracks 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            track_places TEXT NOT NULL,
            start_date DATE,
            end_date DATE,
            track_type TEXT,
            FOREIGN KEY (user_id) REFERENCES accounts (id)
        )
    ''')
    
    # user_survey 테이블 생성
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_survey (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            occupation TEXT NOT NULL,
            education TEXT NOT NULL,
            income TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES accounts (id)
        )
    ''')
    
    conn.commit()
    conn.close()

#추천 페이지 및 경로 ---------------------------------------------------------------------------------------


from place_recommender import PlaceRecommender


@app.route('/Recommend')
def Recommend():
    # 변수 초기화
    restaurant_data = pd.DataFrame()  # 빈 DataFrame으로 초기화
    recommended_places = []  # 추천 장소 리스트 초기화

    try:
        # restaurant.csv 파일 로드
        
        restaurant_data = RESTAURANT_DF
        print(restaurant_data)
    except Exception as e:
        print(f"Error loading CSV file: {e}")
        print(f"Current working directory: {os.getcwd()}")
        return render_template('Recommend.html', recommended_places=[])  # 에러 시 빈 리스트 반환

    age_range = request.args.get('age_range')
    gender = request.args.get('gender')
    nationality = request.args.get('nationality')
    travel_pref = request.args.get('travel_pref')
    food_pref = request.args.get('food_pref')

    # 샘플 데이터
    user_profiles = {
        "user1": {"age_range": "10대", "gender": "여성", "nationality": "한국", "travel_pref": "상큼 발랄한 여름", "food_pref": "밥 요리"},
        "user2": {"age_range": "20대", "gender": "남성", "nationality": "한국", "travel_pref": "도시 탐방", "food_pref": "면 요리"},
        "user3": {"age_range": "30대", "gender": "여성", "nationality": "미국", "travel_pref": "문화적 체험", "food_pref": "채식"},
        "user4": {"age_range": "40대", "gender": "남성", "nationality": "일본", "travel_pref": "자연 속 휴식", "food_pref": "해산물"},
        "user5": {"age_range": "10대", "gender": "여성", "nationality": "일본", "travel_pref": "활동적인 여행", "food_pref": "분식"},
    }

    user_place_matrix = {
        "user1": {2: 1, 6: 1, 122: 1},
        "user2": {5: 1, 8: 1, 10: 1},
        "user3": {2: 1, 4: 1, 15: 1},
        "user4": {3: 1, 6: 1, 7: 1},
        "user5": {1: 1, 9: 1, 12: 1},
    }

    if age_range is None or gender is None or nationality is None or travel_pref is None or food_pref is None:
        recommended_places = []
        print("Parameters missing")
    else:
        try:
            # 새로운 사용자 프로필
            new_user_profile = {"age_range": age_range, "gender": gender, "nationality": nationality, 
                            "travel_pref": travel_pref, "food_pref": food_pref}
            
            # 추천 시스템 초기화 및 추천 실행
            recommender = PlaceRecommender(user_profiles, user_place_matrix)
            recommended_place_ids = recommender.place_recommend(new_user_profile)

        except Exception as e:
            print(f"Error in recommendation process: {e}")
            recommended_places = []

        if recommended_place_ids:
            try:
                # iloc을 사용해 '행 번호'에 해당하는 레코드만 가져오기
                df = RESTAURANT_DF
                recommended_places = df.iloc[recommended_place_ids].to_dict('records')
            except Exception as e:
                print(f"Error slicing RESTAURANT_DF with iloc: {e}")
                recommended_places = []

    return render_template('Recommend.html', recommended_places=recommended_places)




#-------------------------------------------------------  
    # 쿼리 파라미터 추출
    age_range   = request.args.get('age_range')
    gender      = request.args.get('gender')
    nationality = request.args.get('nationality')
    travel_pref = request.args.get('travel_pref')
    food_pref   = request.args.get('food_pref')

    recommended_places = []

    # 필수 파라미터 체크
    if None in (age_range, gender, nationality, travel_pref, food_pref):
        print("Parameters missing")
    else:
        # 샘플 사용자 프로필 & 매트릭스 (기존 코드 그대로)
        user_profiles = {
            "user1": {"age_range": "10대", "gender": "여성", "nationality": "한국", "travel_pref": "상큼 발랄한 여름", "food_pref": "밥 요리"},
            "user2": {"age_range": "20대", "gender": "남성", "nationality": "한국", "travel_pref": "도시 탐방", "food_pref": "면 요리"},
            "user3": {"age_range": "30대", "gender": "여성", "nationality": "미국", "travel_pref": "문화적 체험", "food_pref": "채식"},
            "user4": {"age_range": "40대", "gender": "남성", "nationality": "일본", "travel_pref": "자연 속 휴식", "food_pref": "해산물"},
            "user5": {"age_range": "10대", "gender": "여성", "nationality": "일본", "travel_pref": "활동적인 여행", "food_pref": "분식"},
        }
        user_place_matrix = {
            "user1": {2: 1, 6: 1, 122: 1},
            "user2": {5: 1, 8: 1, 10: 1},
            "user3": {2: 1, 4: 1, 15: 1},
            "user4": {3: 1, 6: 1, 7: 1},
            "user5": {1: 1, 9: 1, 12: 1},
        }

        # 새 사용자 프로필 생성
        new_user_profile = {
            "age_range":   age_range,
            "gender":      gender,
            "nationality": nationality,
            "travel_pref": travel_pref,
            "food_pref":   food_pref
        }

        # 추천 시스템 실행
        try:
            recommender = PlaceRecommender(user_profiles, user_place_matrix)
            recommended_place_ids = recommender.place_recommend(new_user_profile)
        except Exception as e:
            print(f"Error in recommendation process: {e}")
            recommended_place_ids = []
        # 인덱스 배열로 csv 가져옴
        df = RESTAURANT_DF.reset_index()
        # 2) iloc으로 integer IDs에 대응하는 행만 선택
        try:
            filtered = df.iloc[recommended_place_ids]
        except Exception:
            # 혹시 recommended_place_ids가 문자열 이름 리스트일 경우를 대비한 폴백
            filtered = df[df['Name'].isin(recommended_place_ids)]

    return render_template('Recommend.html',
                        recommended_places=recommended_places)

@app.route('/Order')
def Order():
    # URL에서 선택된 장소들을 가져옵니다
    selected_places = request.args.getlist('places')
    
    if not selected_places:
        return redirect(url_for('Recommend'))
        
    return render_template('Order.html', place_list=selected_places)

@app.route('/save_order', methods=['POST'])
def save_order():
    if 'loggedin' not in session:
        return redirect(url_for('login'))
        
    data = request.get_json()
    ordered_places = data.get('orderedPlaces', [])
    start_date = data.get('startDate')
    end_date = data.get('endDate')
    track_type = data.get('trackType')
    
    if not ordered_places:
        return jsonify({'error': 'No places provided'}), 400
        
    # 장소들을 쉼표로 구분된 문자열로 변환
    track_places = ','.join(ordered_places)
    
    try:
        conn = get_logindb_connection()
        cursor = conn.cursor()
        
        # 트랙 정보를 데이터베이스에 저장
        cursor.execute('''
            INSERT INTO tracks (user_id, track_places, start_date, end_date, track_type)
            VALUES (?, ?, ?, ?, ?)
        ''', (session['id'], track_places, start_date, end_date, track_type))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '트랙이 저장되었습니다.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

# Journey    @app.route('/Journey')
def Journey():
    if 'loggedin' not in session:
        return redirect(url_for('login'))

    track_id = request.args.get('track_id')
    conn = get_logindb_connection(); cursor = conn.cursor()
    if track_id:
        cursor.execute('SELECT track_places FROM tracks WHERE id=? AND user_id=?', (track_id, session['id']))
    else:
        cursor.execute('SELECT track_places FROM tracks WHERE user_id=? ORDER BY created_at DESC LIMIT 1', (session['id'],))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return "저장된 트랙이 없습니다.", 400

    place_names = row[0].split(',')
    waypoints = get_waypoints(place_names)

    try:
        route_data = get_route(waypoints)
        route_points = []
        for feat in route_data.get('features', []):
            if feat['geometry']['type'] == 'LineString':
                for lon, lat in feat['geometry']['coordinates']:
                    route_points.append({"lat": lat, "lng": lon})
        if not route_points:
            raise ValueError("유효한 경로 포인트가 없습니다")
    except Exception as e:
        return f"경로 처리 오류: {e}", 500

    # waypoints 이름 매핑
    waypoint_map = {}
    for i, wp in enumerate(waypoints):
        wp_name = wp.get('name') or (place_names[i] if i < len(place_names) else None)
        if wp_name:
            waypoint_map[wp_name.strip()] = wp

    places = []
    for name in place_names:
        wp = waypoint_map.get(name.strip())
        if not wp:
            print(f"[경고] '{name}'에 대한 위경도 정보를 찾지 못했습니다.")
            continue

        subset = RESTAURANT_DF[RESTAURANT_DF['Name'] == name]
        if not subset.empty:
            r = subset.iloc[0]
            places.append({
                "name": name,
                "lat": float(wp['latitude']),
                "lng": float(wp['longitude']),
                "address": r.get('Address', ''),
                "img": r.get('Img', ''),
                "homepage": r.get('Homepage', ''),
                "type": r.get('Type', ''),
                "rate": r.get('Rate', ''),
                "operation": r.get('Operation', '')
            })

    return render_template(
        'Journey.html',
        route_points=json.dumps(route_points),
        places=json.dumps(places)
    )
#-------------- Journey 끝 --------------

# TTS 언어별 장소 정보를 반환하는 엔드포인트
@app.route('/locations', methods=['GET'])
def get_locations():
    lang = request.args.get('lang', 'ko').lower()
    data = LOCATIONS.get(lang, LOCATIONS['ko'])
    return jsonify(data)

@app.route('/Or')
def Or():
    return render_template('or.html')
    
@app.route('/official')
def official_survey():
    return render_template('official.html')

@app.route('/Survey', methods=['GET', 'POST'])
def Survey():
    if 'loggedin' not in session:
        return redirect(url_for('login'))
        
    if request.method == 'POST':
        try:
            # POST 데이터 받기
            age_range = request.form.get('age_range')
            gender = request.form.get('gender')
            nationality = request.form.get('nationality')
            travel_pref = request.form.get('travel_pref')
            food_pref = request.form.get('food_pref')
            start_date = request.form.get('start_date')
            end_date = request.form.get('end_date')
            track_type = request.form.get('track_type')
            
            # 나이 범위를 숫자로 변환 (예: "20-30" -> 25)
            age = 0
            if age_range == "10-20":
                age = 15
            elif age_range == "20-30":
                age = 25
            elif age_range == "30-50":
                age = 40
            elif age_range == "50+":
                age = 60
            
            conn = get_logindb_connection()
            cursor = conn.cursor()
            
            # 기존 설문 데이터가 있는지 확인
            cursor.execute('SELECT id FROM user_survey WHERE user_id = ?', (session['id'],))
            existing_survey = cursor.fetchone()
            
            if existing_survey:
                # 기존 데이터 업데이트
                cursor.execute('''
                    UPDATE user_survey 
                    SET age = ?, gender = ?, nationality = ?, 
                        travel_pref = ?, food_pref = ?, 
                        start_date = ?, end_date = ?, track_type = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                ''', (age, gender, nationality, travel_pref, food_pref, 
                      start_date, end_date, track_type, session['id']))
            else:
                # 새로운 데이터 삽입
                cursor.execute('''
                    INSERT INTO user_survey (
                        user_id, age, gender, nationality, 
                        travel_pref, food_pref, start_date, 
                        end_date, track_type
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (session['id'], age, gender, nationality, 
                      travel_pref, food_pref, start_date, 
                      end_date, track_type))
            
            conn.commit()
            conn.close()
            
            # URL 파라미터로 데이터 전달
            params = {
                'age_range': age_range,
                'gender': gender,
                'nationality': nationality,
                'travel_pref': travel_pref,
                'food_pref': food_pref,
                'start_date': start_date,
                'end_date': end_date,
                'track_type': track_type
            }
            
            return redirect(url_for('Recommend', **params))
            
        except Exception as e:
            print(f"Error saving survey data: {e}")
            return render_template('Survey.html', error="설문 데이터 저장 중 오류가 발생했습니다.")
    
    # GET 요청일 경우 기존 설문 데이터가 있다면 가져와서 표시
    conn = get_logindb_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM user_survey WHERE user_id = ?', (session['id'],))
    survey_data = cursor.fetchone()
    conn.close()
    
    return render_template('Survey.html', survey_data=survey_data)

@app.route('/optimize_route', methods=['POST'])
def optimize_route():
    data = request.json
    places = data['places']
    route_type = data['routeType']
    
    if route_type == 'circular':
        optimized_route, _ = tsp_shortest_path(places)
    else:
        optimized_route, _ = astar_shortest_path(places)
        
    return jsonify({'optimized_route': optimized_route})

# 트랙 선택 페이지 ------------------------------------------------------------------------------------------------

@app.route('/track_select')
def track_select():
    if 'loggedin' not in session:
        return redirect(url_for('login'))
        
    conn = get_logindb_connection()
    cursor = conn.cursor()
    
    # 현재 로그인한 사용자의 트랙 정보 가져오기
    cursor.execute('''
        SELECT id, created_at, track_places, start_date, end_date, track_type
        FROM tracks 
        WHERE user_id = ?
        ORDER BY created_at DESC
    ''', (session['id'],))
    
    tracks = []
    for row in cursor.fetchall():
        tracks.append({
            'id': row[0],
            'created_at': row[1],
            'track_places': row[2],
            'start_date': row[3],
            'end_date': row[4],
            'track_type': row[5]
        })
    
    conn.close()
    return render_template('track_select.html', tracks=tracks)

@app.route('/delete_track/<int:track_id>', methods=['DELETE'])
def delete_track(track_id):
    if 'loggedin' not in session:
        return jsonify({'success': False, 'error': '로그인이 필요합니다.'})
        
    conn = get_logindb_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM tracks WHERE id = ? AND user_id = ?', 
                    (track_id, session['id']))
        conn.commit()
        success = cursor.rowcount > 0
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.before_request
def make_session_permanent():
    session.permanent = True




#----------------journey에 tts병합


# @app.route("/check-range", methods=["POST"])
# def check_range():
#     """사용자 위치가 반경 안에 있는지 확인."""
#     try:
#         user_lat = float(request.json["lat"])
#         user_lng = float(request.json["lng"])

#         for loc in LOCATIONS:
#             place_coords = (loc["lat"], loc["lng"])
#             user_coords = (user_lat, user_lng)
#             if geodesic(place_coords, user_coords).meters <= 500:
#                 return jsonify({"in_range": True, "explanation": loc["explanation"]})
#         return jsonify({"in_range": False})
#     except Exception as e:
#         print("Error in /check-range:", str(e))  # 에러 메시지 출력
#         return jsonify({"error": "Failed to check range"}), 500
    

if __name__ == "__main__":
    app.run(debug=True)
    print("실행 시작! 얼마나 걸릴지 모르니 기다리자")
